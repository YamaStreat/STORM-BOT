# STØRM // PVP Discord Bot

Bot Discord avec :

- ✅ Message de bienvenue
- ✅ Rôle automatique à l'arrivée
- ✅ Système de tickets
- ✅ Panneau de tickets avec bouton
- ✅ Fermeture automatique des tickets
- ✅ Commandes staff
- ✅ Logs de modération
- ✅ Commande `/staff`

## Installation

### 1. Installer Node.js

Node.js 18 ou supérieur recommandé.

### 2. Installer les dépendances

```bash
npm install
```

### 3. Créer le fichier `.env`

Copie `.env.example` vers `.env` :

```env
TOKEN=TON_TOKEN_DE_BOT
```

Ne publie jamais ton token sur GitHub.

### 4. Configurer `config.json`

```json
{
  "guildId": "ID_DU_SERVEUR",
  "welcomeChannelId": "ID_SALON_BIENVENUE",
  "autoRoleId": "ID_ROLE_AUTOMATIQUE",
  "ticketCategoryId": "ID_CATEGORIE_TICKETS",
  "ticketStaffRoleId": "ID_ROLE_STAFF_TICKETS",
  "logsChannelId": "ID_SALON_LOGS"
}
```

## Où trouver les ID Discord ?

Discord → Paramètres → Avancé → active **Mode développeur**.

Puis clic droit sur :
- ton serveur → Copier l'identifiant du serveur
- un salon → Copier l'identifiant du salon
- un rôle → Copier l'identifiant du rôle

## Permissions importantes pour le bot

Le rôle du bot doit avoir au minimum :

- Voir les salons
- Envoyer des messages
- Gérer les salons
- Gérer les rôles
- Expulser des membres
- Bannir des membres
- Modérer des membres
- Gérer les messages
- Lire l'historique des messages

Le rôle du bot doit être placé **au-dessus du rôle automatique** dans la liste des rôles Discord.

## Intents à activer

Dans Discord Developer Portal → Bot → Privileged Gateway Intents :

- SERVER MEMBERS INTENT : ON
- MESSAGE CONTENT INTENT : ON

## Commandes

- `/ticket-panel` : poste le panneau de tickets
- `/staff` : affiche la liste du staff
- `/clear nombre` : supprime des messages
- `/kick membre raison`
- `/ban membre raison`
- `/timeout membre minutes raison`

## Lancement

```bash
npm start
```

Le bot enregistre automatiquement les commandes slash sur le serveur configuré.
