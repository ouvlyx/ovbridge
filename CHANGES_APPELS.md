# Correctifs appels audio/vidéo

Fichiers modifiés / ajoutés :
- src/features/calls/CallContext.ts      (nouveau) contexte + hook useCall()
- src/features/calls/CallProvider.tsx    (nouveau) signalisation + WebRTC, écoute des appels entrants
- src/features/calls/CallDialog.tsx      (réécrit) sonnerie, répondre/refuser, flux distant audible
- src/features/calls/useCallSession.ts   (supprimé) remplacé par CallProvider
- src/components/AppLayout.tsx           enveloppé dans <CallProvider>
- src/features/transfers/ChatPage.tsx    utilise useCall(), plus de CallDialog local
- src/vite-env.d.ts, .env.example        variables TURN optionnelles
- public/manifest.webmanifest            supprimé (fichier vide qui entrait en conflit avec le manifest généré par vite-plugin-pwa)
