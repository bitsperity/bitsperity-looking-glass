"""
Pattern extraction from validated hypotheses
"""

from datetime import datetime
from typing import List
import uuid

from ..models.graph import Pattern, Hypothesis, Edge
from ..storage import GraphStore


class PatternExtractor:
    """Extract validated patterns from hypotheses"""
    
    def __init__(self, graph_store: GraphStore):
        self.store = graph_store
    
    def extract_pattern_from_hypothesis(
        self,
        hypothesis: Hypothesis,
        evidence_edges: List[Edge]
    ) -> Pattern:
        """
        Convert validated hypothesis into reusable pattern.
        Analyzes evidence to determine pattern characteristics.
        
        Args:
            hypothesis: The hypothesis to extract pattern from
            evidence_edges: Supporting evidence edges
            
        Returns:
            Pattern object
        """
        # Determine pattern category based on hypothesis relation_type
        category = self._infer_category(hypothesis.relation_type)
        
        # Calculate success rate based on evidence confidence
        success_rate = self._calculate_success_rate(evidence_edges)
        
        pattern = Pattern(
            id=str(uuid.uuid4()),
            name=hypothesis.statement,
            description=f"Validated pattern extracted from hypothesis: {hypothesis.statement}",
            category=category,
            confidence=hypothesis.confidence,
            validated_at=datetime.utcnow(),
            validated_by=hypothesis.created_by,
            manifold_source_id=hypothesis.manifold_thought_id,
            occurrences=1,  # First occurrence
            success_rate=success_rate
        )
        
        return pattern
    
    def _infer_category(self, relation_type: str) -> str:
        """Infer pattern category from relation type"""
        # Map relation types to categories
        category_map = {
            "COMPETES_WITH": "fundamental",
            "SUPPLIES_TO": "fundamental",
            "CORRELATES_WITH": "technical",
            "PRECEDES": "temporal",
            "CAUSES": "fundamental",
            "BENEFITS_FROM": "fundamental",
            "AFFECTS": "macro"
        }
        
        return category_map.get(relation_type, "behavioral")
    
    def _calculate_success_rate(self, evidence_edges: List[Edge]) -> float:
        """Calculate success rate from evidence confidence scores"""
        if not evidence_edges:
            return 0.5  # Default if no evidence
        
        # Average confidence of supporting evidence
        confidences = [
            edge.properties.get("confidence", 0.5) 
            for edge in evidence_edges
        ]
        
        return sum(confidences) / len(confidences)
    
    def find_similar_patterns(
        self,
        pattern: Pattern,
        similarity_threshold: float = 0.8
    ) -> List[Pattern]:
        """
        Check if similar pattern already exists.
        Uses name similarity and category matching.
        
        Args:
            pattern: Pattern to find similars for
            similarity_threshold: Minimum similarity score (0-1)
            
        Returns:
            List of similar Pattern objects
        """
        query = """
            MATCH (p:Pattern)
            WHERE p.category = $category
            AND p.name CONTAINS $name_fragment
            AND p.confidence >= $min_confidence
            RETURN p
            LIMIT 10
        """
        
        # Extract key words from pattern name for matching
        name_words = pattern.name.split()
        name_fragment = " ".join(name_words[:3]) if len(name_words) >= 3 else pattern.name
        
        results = self.store.execute_read(query, {
            "category": pattern.category,
            "name_fragment": name_fragment,
            "min_confidence": pattern.confidence * similarity_threshold
        })
        
        similar_patterns = []
        for record in results:
            p_data = dict(record["p"])
            similar_patterns.append(Pattern(
                id=p_data.get("id"),
                name=p_data.get("name"),
                description=p_data.get("description", ""),
                category=p_data.get("category"),
                confidence=p_data.get("confidence"),
                validated_at=datetime.fromisoformat(p_data.get("validated_at")),
                validated_by=p_data.get("validated_by"),
                manifold_source_id=p_data.get("manifold_source_id"),
                occurrences=p_data.get("occurrences", 0),
                success_rate=p_data.get("success_rate")
            ))
        
        return similar_patterns
    
    def create_pattern_node(self, pattern: Pattern) -> dict:
        """
        Create Pattern node in Neo4j
        
        Args:
            pattern: Pattern to create
            
        Returns:
            Dict with created node data
        """
        query = """
            CREATE (p:Pattern {
                id: $id,
                name: $name,
                description: $description,
                category: $category,
                confidence: $confidence,
                validated_at: $validated_at,
                validated_by: $validated_by,
                manifold_source_id: $manifold_source_id,
                occurrences: $occurrences,
                success_rate: $success_rate,
                created_at: datetime()
            })
            RETURN p
        """
        
        result = self.store.execute_write(query, {
            "id": pattern.id,
            "name": pattern.name,
            "description": pattern.description,
            "category": pattern.category,
            "confidence": pattern.confidence,
            "validated_at": pattern.validated_at.isoformat(),
            "validated_by": pattern.validated_by,
            "manifold_source_id": pattern.manifold_source_id,
            "occurrences": pattern.occurrences,
            "success_rate": pattern.success_rate
        })
        
        return dict(result["p"]) if result else {}
    
    def link_pattern_to_evidence(
        self,
        pattern_id: str,
        evidence_ids: List[str]
    ) -> int:
        """
        Create VALIDATES edges from pattern to supporting evidence
        
        Args:
            pattern_id: Pattern node ID
            evidence_ids: List of evidence node IDs
            
        Returns:
            Number of edges created
        """
        query = """
            MATCH (p:Pattern {id: $pattern_id})
            MATCH (e:Event)
            WHERE e.id IN $evidence_ids
            MERGE (p)-[r:VALIDATES]->(e)
            SET r.created_at = datetime()
            RETURN count(r) as count
        """
        
        result = self.store.execute_write(query, {
            "pattern_id": pattern_id,
            "evidence_ids": evidence_ids
        })
        
        return result.get("count", 0) if result else 0

