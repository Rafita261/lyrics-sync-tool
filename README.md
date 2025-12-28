# 🎵 Lyrics Sync Tool

Outil **simple** pour synchroniser des paroles avec un fichier audio ou vidéo, puis exporter le résultat en **LRC** ou **SRT**.

---

## 🚀 Fonctionnalités

- ⏱️ Synchronisation manuelle des paroles en temps réel
- 🎶 Démarrage forcé à **00:00.00** (standard LRC respecté)
- ⌨️ Contrôles clavier immersifs (desktop)
- 📱 Bouton dédié pour mobile
- 📄 Export :

  - **LRC** (karaoké / lecteurs audio)
  - **SRT** (vidéo / sous‑titres)

- ✨ Interface propre, sans correction orthographique automatique
- Recherche automatique des paroles dans l' Internet

---

## 🖥️ Utilisation (Desktop – recommandé)

1. Ouvrir le fichier `index.html` dans un navigateur
2. Renseigner **Titre** et **Artiste** (optionnel mais utile)
3. Rechercher les paroles et choisir parmi les proposées ou Coller les paroles (1 ligne = 1 phrase)
4. Charger un fichier audio ou vidéo
5. Cliquer sur **▶️ Synchroniser**
6. Pendant la lecture :

   - `ESPACE` → Lecture / Pause
   - `ENTRÉE` → Passer à la ligne suivante

7. Exporter en **LRC** ou **SRT**

👉 Expérience la plus fluide et précise sur ordinateur.

---

## 📱 Utilisation Mobile

- Un bouton **➡️ Ligne suivante** apparaît automatiquement
- Fonctionnel, mais moins précis qu’au clavier

> ℹ️ L’utilisation sur ordinateur reste plus immersive et simple.

---

## 📂 Formats exportés

### LRC

- Compatible AIMP, foobar2000, MusoPlayer(Mobile), etc.
- Première ligne forcée à `00:00.00`

### SRT

- Compatible lecteurs vidéo comme VLC et éditeurs de sous‑titres
- Durée automatique si la ligne suivante n’existe pas

---

## 🔮 Prochaines versions (roadmap)

- 🔗 Fusion audio + paroles via **FFmpeg**
- 🎤 Mode karaoké (highlight progressif)
- 🎬 Prévisualisation vidéo

---

## 🧠 Notes techniques

- HTML / CSS / VanillaJS
- Backend Flask

---

## Contribution

Créer un Pull Request pour contibuer et y expliquer clairement votre Contribution (Correction de Bugs/ Ajouts de nouveaux fonctionnalités / Modification UI/UX / ...)

La repo github du backend est [ici](https://github.com/Rafita261/Lyrics-Sync-Tool-Backend.git)

## 📜 Licence

Libre d’utilisation pour projets personnels ou éducatifs.

---

💡 Projet pensé pour apprendre, prototyper et aller droit au but.

Have fun & sync clean 🎶
