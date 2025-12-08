# 🏫 SunuClasse - Plateforme de Gestion Scolaire

**SunuClasse** est une application web moderne (React + TypeScript + Supabase) conçue pour digitaliser la vie de classe en Afrique et ailleurs. Elle permet une gestion fluide des emplois du temps, examens, sondages et visioconférences.

---

## 🚀 Fonctionnalités Clés

*   **Multi-Rôles** : Admin, Responsable Pédagogique, Étudiant.
*   **Tableau de Bord** : Vue d'ensemble des activités du jour et alertes.
*   **Examens (DS)** : Calendrier, alertes automatiques et export CSV.
*   **Sondages** : Vote en temps réel, anonyme ou public, avec visualisation graphique.
*   **Annonces & Meet** : Fil d'actualité et gestion des liens de visioconférence.
*   **Administration** : Gestion des utilisateurs, des classes et journal d'audit de sécurité.
*   **Design** : Interface inspirée des motifs africains (Bogolan, Wax) et optimisée mobile-first.

---

## 🛠️ Installation & Démarrage

### Pré-requis
*   Node.js (v16+)
*   NPM ou Yarn

### 1. Cloner et Installer
```bash
git clone https://github.com/votre-repo/sunuclasse.git
cd sunuclasse
npm install
```

### 2. Configuration
Créez un fichier `.env` à la racine si vous souhaitez tester l'IA Gemini en local (Optionnel) :
```env
API_KEY=votre_cle_google_gemini
```

### 3. Lancer en local
```bash
npm run dev
```
L'application sera accessible sur `http://localhost:5173`.

---

## 🔐 Comptes de Démonstration

Une fois la base de données Supabase connectée (voir script SQL fourni), voici les utilisateurs par défaut :

| Rôle | Email | Mot de passe (Simulé) |
| :--- | :--- | :--- |
| **Admin** | `faye@eco.com` | `passer25` |
| **Responsable** | `diallo@eco.com` | `(au choix)` |
| **Étudiant** | `ami@student.com` | `(au choix)` |

> **Note** : L'authentification actuelle vérifie uniquement l'existence de l'email dans la table `users`.

---

## 📦 Déploiement (Vercel)

Ce projet est configuré pour un déploiement "Zero Config" sur Vercel.

1.  Poussez votre code sur GitHub.
2.  Importez le projet sur Vercel.
3.  Ajoutez la variable d'environnement `API_KEY` (pour Gemini) dans les réglages Vercel.
4.  Déployez !

---

## 🏗️ Stack Technique

*   **Frontend** : React 18, Vite, Tailwind CSS.
*   **Langage** : TypeScript.
*   **Backend / DB** : Supabase (PostgreSQL).
*   **IA** : Google Gemini (Génération de contenu).
*   **Icones** : Lucide React.
*   **Dates** : date-fns.

---

© 2025 SunuClasse. Fait avec ❤️ par Serigne Fallou Faye.