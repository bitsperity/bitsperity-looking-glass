# Telegram MCP Setup für Coalescence

## Bot Token

Der Bot Token wurde in `coalescence/config/mcps-stdio.yaml` konfiguriert:
- **Bot Token**: `8455077673:AAGb_ifKaWXAt2Wj2RsnEkG3iCQFx-iqvtI`
- **Bot Username**: `@no3sis_bot`

## Verwendung

### Chat ID herausfinden

1. Starte eine Unterhaltung mit dem Bot: `@no3sis_bot`
2. Schreibe eine Nachricht an den Bot
3. Öffne: `https://api.telegram.org/bot8455077673:AAGb_ifKaWXAt2Wj2RsnEkG3iCQFx-iqvtI/getUpdates`
4. Die Chat ID findest du unter `result[0].message.chat.id` (z.B. `123456789`)

Oder:
- Für Gruppen: Die Chat ID ist meist negativ (z.B. `-1001234567890`)
- Für deinen eigenen Chat: Schreibe `@userinfobot` an, um deine Chat ID zu sehen

### Tools verfügbar

Nach dem Start von Coalescence sind folgende Telegram-Tools verfügbar:

- `telegram_send_message` - Nachricht senden
- `telegram_send_photo` - Foto senden
- `telegram_send_document` - Dokument senden
- `telegram_send_video` - Video senden
- `telegram_get_chat` - Chat-Informationen abrufen
- `telegram_forward_message` - Nachricht weiterleiten
- `telegram_delete_message` - Nachricht löschen

### Beispiel: Nachricht senden

Die Agents können jetzt nach ihren Tasks Nachrichten senden:

```json
{
  "chatId": "123456789",  // Deine Chat ID
  "text": "Task abgeschlossen! ✅"
}
```

Das Token wird automatisch aus der Environment Variable `TELEGRAM_BOT_TOKEN` geladen.

## Sicherheit

⚠️ **WICHTIG**: Der Bot Token ist aktuell direkt in der Config-Datei gespeichert. 

Für Produktion solltest du:
1. Den Token in eine `.env` Datei verschieben
2. Die Config-Datei aus Git ausschließen (oder den Token entfernen)
3. Den Token als Environment Variable beim Start übergeben

## Nächste Schritte

1. Starte Coalescence neu, damit die Telegram MCP geladen wird
2. Teste mit einem Agent, ob Nachrichten gesendet werden können
3. Gib den Agents die Chat ID, damit sie dir schreiben können

