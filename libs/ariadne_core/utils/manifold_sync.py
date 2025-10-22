"""
Utilities for Ariadne-Manifold coordination
"""


class ManifoldSync:
    """Utilities for preparing sync payloads between Ariadne and Manifold"""
    
    @staticmethod
    def prepare_validation_update(
        hypothesis_id: str,
        manifold_thought_id: str,
        validated: bool
    ) -> dict:
        """
        Prepare payload for agent to update Manifold thought status.
        Returns structured data for Manifold PATCH /v1/memory/thought/{id}
        
        Args:
            hypothesis_id: Ariadne hypothesis ID
            manifold_thought_id: Manifold thought ID to update
            validated: Whether hypothesis was validated or invalidated
            
        Returns:
            Dict with update payload for Manifold API
        """
        return {
            "thought_id": manifold_thought_id,
            "status": "validated" if validated else "invalidated",
            "ariadne_fact_id": hypothesis_id,
            "promoted_to_kg": validated
        }
    
    @staticmethod
    def prepare_hypothesis_creation(
        hypothesis_id: str,
        manifold_thought_id: str,
        statement: str,
        confidence: float
    ) -> dict:
        """
        Prepare payload for agent to link new Ariadne hypothesis back to Manifold.
        
        Args:
            hypothesis_id: Newly created Ariadne hypothesis ID
            manifold_thought_id: Source Manifold thought ID
            statement: Hypothesis statement
            confidence: Confidence score
            
        Returns:
            Dict with metadata to add to Manifold thought
        """
        return {
            "ariadne_hypothesis_id": hypothesis_id,
            "hypothesis_statement": statement,
            "confidence": confidence,
            "in_validation_queue": True
        }
    
    @staticmethod
    def prepare_pattern_metadata(
        pattern_id: str,
        pattern_name: str,
        hypothesis_id: str,
        manifold_thought_id: str
    ) -> dict:
        """
        Prepare metadata for agent to add to Manifold thought after pattern creation.
        
        Args:
            pattern_id: Newly created Pattern ID in Ariadne
            pattern_name: Pattern name
            hypothesis_id: Source hypothesis ID
            manifold_thought_id: Source Manifold thought ID
            
        Returns:
            Dict with pattern promotion metadata
        """
        return {
            "promoted_to_pattern": True,
            "pattern_id": pattern_id,
            "pattern_name": pattern_name,
            "source_hypothesis_id": hypothesis_id,
            "thought_id": manifold_thought_id
        }

