TaskFlow – Documentation technique
1. Architecture & Choix Techniques
1.1 Architecture générale (Full-Stack découplée)

Le projet est construit sur une architecture découplée en trois blocs principaux :

Frontend (Next.js) → API (NestJS REST) → Base de données (PostgreSQL sur Neon)

Pourquoi une architecture découplée ?

L’objectif est d’assurer :

Clarté

Évolutivité

Maintenabilité

Scalabilité

Séparation des responsabilités

Frontend : gestion de l’interface utilisateur (UI/UX) et de l’expérience utilisateur.

API (Backend) : gestion de la logique métier, de la sécurité, de la validation et des règles d’accès.

Base de données : gestion de la persistance et de la cohérence des données.

Avantages

Chaque partie peut évoluer indépendamment.

Possibilité d’ajouter un client mobile sans modifier l’API.

Possibilité de scaler uniquement l’API.

API REST réutilisable par d’autres systèmes internes.

Benchmark vs architecture monolithique (Next.js fullstack)

Alternative possible :

Next.js (UI + API Routes + DB)

Avantages

Mise en place rapide

Moins de projets à gérer

Limites

Logique métier mélangée à la couche UI

Sécurité moins structurée

Moins adapté à une architecture “entreprise”

Gestion des jobs/cron plus complexe

Choix final

Le projet s’apparente davantage à un produit orienté entreprise
(rôles, audit, permissions, modules, évolutivité).
Le découplage apporte donc plus de robustesse.

1.2 Frontend : Next.js + App Router + TailwindCSS
Pourquoi Next.js ?

Next.js combine :

Routage moderne (App Router)

Excellente intégration TypeScript

Performances optimisées

Facilité de déploiement

Structure claire orientée produit

Benchmark vs React pur (Vite + React Router)
React (Vite)	Next.js
Très léger	Framework structurant
Démarrage rapide	Structure robuste
Routage à configurer	Routing intégré
Moins orienté SSR	SSR/SSG natif
Choix final

Next.js est plus adapté pour une application type dashboard produit structuré.

App Router & Client Components

App Router : architecture claire basée sur les dossiers.

Client Components : utilisées pour les interactions (modals, tables, actions dynamiques).

Protection des pages via requireAuth() côté client.

TailwindCSS

Rapidité de développement

Cohérence visuelle

Facilité d’itération

Idéal dans un contexte de délai court

Communication API

Utilisation d’un wrapper apiFetch :

Centralisation des erreurs

Réduction du code répétitif

Facilite l’ajout futur d’un refresh token automatique

1.3 Backend : NestJS + Architecture modulaire
Pourquoi NestJS ?

NestJS est adapté aux architectures “entreprise” grâce à :

Architecture modulaire (Modules / Controllers / Services)

Injection de dépendances

Guards

Pipes

Intégration JWT native

Benchmark vs Express
Express	NestJS
Minimal	Structuré
Flexible	Modulaire
Risque de désorganisation	Convention forte
Moins encadré	Scalable
Choix final

Compte tenu des modules (auth, workspaces, tasks, rôles, notifications),
une architecture modulaire est plus robuste.

Authentification JWT (Access + Refresh)

Access token utilisé en Bearer.

Refresh token stocké en base sous forme hashée.

Benchmark vs sessions/cookies
Sessions	JWT
Adapté monolithique	Adapté API découplée
Stateful	Stateless
Moins mobile-friendly	Mobile-ready
Choix JWT

Architecture découplée + API réutilisable.

Guards

JwtAuthGuard : protège les routes authentifiées.

AdminGuard : protège les routes admin.

Avantage : séparation claire entre sécurité et logique métier.

Validation DTO

Validation automatique via ValidationPipe

class-validator

Nettoyage des champs inattendus

Robustesse API même si le front évolue

1.4 Base de données : PostgreSQL + Neon + Prisma
1.4.1 Pourquoi PostgreSQL ?

Le domaine TaskFlow est fortement relationnel :

Workspaces

Membres

Projets

Tâches

Permissions

Audit

PostgreSQL est optimal pour :

Jointures (JOIN)

Contraintes

Transactions

Cohérence forte

Benchmark vs MongoDB

MongoDB est pertinent pour :

Données peu relationnelles

Schéma flexible

Mais ici :

Relations centrales

Contraintes fortes nécessaires

Modèle relationnel naturel

Choix final

PostgreSQL correspond parfaitement au domaine métier.

Benchmark vs MySQL

MySQL est adapté, mais PostgreSQL est souvent préféré pour :

Richesse fonctionnelle

Robustesse transactionnelle

Standard SaaS/Entreprise

1.4.2 Pourquoi Neon ?

Neon fournit :

PostgreSQL managé

Mise en place rapide

Compatible Prisma

Idéal en environnement dev/cloud

Benchmark vs Supabase :

Supabase propose Auth + Storage + Realtime.

Ici :

Auth déjà gérée par NestJS

Logique métier personnalisée

Neon évite la duplication de services.

1.4.3 Pourquoi Prisma ?

Avantages :

Typage TypeScript fort

Schéma central lisible

Migrations intégrées

Productivité élevée

Benchmark :

SQL brut	Prisma
Contrôle total	Rapidité
Maintenance complexe	Typage sécurisé
Migrations manuelles	Migrations intégrées

Choix final : Prisma pour livrer vite tout en gardant une architecture propre.

1.5 Concepts de robustesse
Soft Delete

Au lieu de supprimer une ligne :

deleted = 1
active = 0


Avantages :

Conservation de l’historique

Sécurité des relations

Adapté contexte entreprise

Audit Fields

creator_id

updator_id

deleted_date

etc.

Permet :

Traçabilité

Conformité

Debug facilité

Enums métiers

Exemples :

TaskStatus

WorkspaceRole

InviteStatus

Avantages :

Évite les valeurs incohérentes

Renforce l’intégrité

Rend le code plus lisible

2️ Structure du Backend – Domain Driven Design (DDD léger)
2.1 Principe : DDD “léger” orienté domaines

Le backend NestJS est organisé par domaines fonctionnels (features) plutôt que par séparation purement technique.

Au lieu d’avoir une structure globale comme :

controllers/
services/
dto/


Chaque domaine encapsule ses propres composants.

Chaque domaine contient :

Controller → expose les routes HTTP

Service → contient la logique métier

DTO → définit et valide les payloads

Module → assemble les dépendances

 Objectifs de cette organisation

Lisibilité : on sait immédiatement où chercher une fonctionnalité.

Évolutivité : ajouter un domaine n’impacte pas les autres.

Cohérence métier : permissions, audit, soft delete restent centralisés par feature.

2.2 Arborescence type

Exemple d’organisation :

src/
  auth/
  workspaces/
  projects/
  tasks/
  comments/
  notifications/
  attachments/
  admin-users/
  dashboard/


Structure interne typique d’un domaine :

domain/
  domain.controller.ts
  domain.service.ts
  dto/
    create-domain.dto.ts
    update-domain.dto.ts
  domain.module.ts

2.3 Rôle de chaque couche
A) Controller – Interface HTTP

Le Controller :

Définit les routes (@Get, @Post, @Patch, @Delete)

Applique les guards (@UseGuards(JwtAuthGuard, ...))

Récupère les paramètres (@Param, @Query, @Body)

Délègue la logique métier au service

 Aucune logique métier complexe ne doit être implémentée ici.

Bonnes pratiques appliquées

Routes REST claires

Protection via Guards

Validation automatique via DTO + ValidationPipe global

B) Service – Logique métier

Le Service :

Centralise les règles métier

Orchestration Prisma (transactions si nécessaire)

Applique les règles d’accès

Gère les audit fields et soft delete

Avantages

Logique réutilisable (ex : futurs cron jobs)

Meilleure testabilité

Pas de duplication dans les controllers

C) DTO – Validation & Contrats

Les DTO :

Définissent le contrat d’entrée

Valident via class-validator

Protègent l’API contre les payloads invalides

Exemples de validations :

Email valide

Mot de passe minimum 6 caractères

Enum strict pour rôles/statuts

Champs nettoyés via whitelist: true

Cela garantit une API robuste et cohérente.

D) Module – Assemblage

Le Module :

Déclare controllers et providers

Importe les dépendances nécessaires (ex : PrismaModule)

Rend le domaine autonome et “plug-and-play”

Résultat : chaque domaine est isolé et proprement intégré dans AppModule.

2.4 Exemple concret par domaine
 auth/

Responsabilités :

Login

Refresh token

Logout

Endpoint /auth/me

Gestion JWT

Stockage du refresh token hashé

Contenu typique :

auth.controller.ts
auth.service.ts
jwt.strategy.ts
jwt.guard.ts
dto/

 workspaces/

Responsabilités :

Création et gestion des workspaces

Gestion des rôles (OWNER / MANAGER / MEMBER)

Gestion des membres

Invitations

Contenu typique :

workspaces.controller.ts
workspaces.service.ts
workspace-invites.service.ts
dto/

 tasks/

Responsabilités :

CRUD des tâches

Assignation / réassignation

Actions métier (ack, close, desist)

Historique des actions

 notifications/

Responsabilités :

Liste des notifications utilisateur

Marquage comme lue

Notifications système (deadline, invitation, etc.)

 dashboard/

Responsabilité :

Endpoint agrégé /dashboard

Centralise plusieurs domaines

Évite au frontend d’effectuer plusieurs appels séparés

2.5 Benchmark – Pourquoi un DDD léger ?
 Structure “par type” globale

Alternative :

controllers/
services/
dto/


Limites :

Navigation difficile

Duplication possible

Confusion quand le projet grossit

 DDD strict (Entities / Aggregates / Repositories)

Avantages :

Très robuste

Idéal pour très gros systèmes

Limites :

Trop lourd pour un MVP

Beaucoup d’abstractions

Délai de développement plus long

 DDD léger (choix retenu)

Organisation par feature

Code simple et maintenable

Évolutif

Livrable dans les délais

Cela offre un bon équilibre entre robustesse et rapidité d’exécution.


3️ Sécurité

La sécurité de l’application repose sur trois piliers :

Authentification JWT (Access + Refresh)

Autorisation par rôles (globaux + workspace)

Contrôles métier complémentaires côté services

3.1 Authentification
 JWT Access Token (15 minutes)

L’Access Token est utilisé pour authentifier chaque requête API via l’en-tête :

Authorization: Bearer <accessToken>


Durée de validité : 15 minutes.

Le token contient les informations minimales nécessaires :

sub (user_id)

email

name

éventuellement global_role

 Pourquoi 15 minutes ? (Benchmark)
Durée	Avantage	Inconvénient
5 min	Sécurité maximale	Trop de refresh
1h	Confort UX	Risque plus long si token volé
15 min	Bon compromis	—

Choix retenu : 15 minutes

C’est un standard courant en production, équilibrant sécurité et expérience utilisateur.

 JWT Refresh Token (7 jours)

Le Refresh Token permet d’obtenir un nouveau Access Token lorsque celui-ci expire.

Durée : 7 jours

Stocké côté client (localStorage dans le MVP).

 Pourquoi 7 jours ? (Benchmark)
Durée	Avantage	Inconvénient
24h	Plus sécurisé	Reconnexion fréquente
30 jours	UX confortable	Risque prolongé
7 jours	Compromis équilibré	—

Choix retenu : 7 jours

Adapté à un MVP tout en restant cohérent avec des pratiques réelles.

 Refresh Tokens hashés en base (SHA-256)

Lors du login :

Le refresh token est généré.

Il est renvoyé au client.

En base, seul son hash est stocké :

token_hash = sha256(refreshToken)

Avantages

Si la base de données est compromise, les refresh tokens ne sont pas exploitables.

Possibilité de révocation (logout).

Compatible avec rotation future des tokens.

 Benchmark vs stockage en clair
Méthode	Risque
En clair	Très dangereux si fuite DB
Hashé	Standard sécurité

Choix retenu : stockage hashé

3.2 Autorisation
 Rôles globaux (plateforme)

Deux rôles principaux :

ADMIN

USER

Exemple d’utilisation :

AdminGuard → req.user.global_role === 'ADMIN'


Routes protégées via :

@UseGuards(JwtAuthGuard, AdminGuard)

 Benchmark vs permissions fines
Modèle	Avantage	Complexité
RBAC/ABAC avancé	Très précis	Complexe
Rôles simples	Lisible	Limité

Choix MVP : rôles simples

Suffisant, rapide à auditer, adapté au délai.

 Rôles par Workspace (niveau domaine)

Un utilisateur peut avoir un rôle différent selon le workspace :

OWNER

MANAGER

MEMBER

Ces rôles sont stockés dans WorkspaceMember.

Pourquoi séparer rôle global et rôle workspace ?

Un utilisateur peut être :

USER global

OWNER dans un workspace

MEMBER dans un autre

Cela reflète les outils réels (Notion, Asana, Jira).

 Guards NestJS

Protection des routes via :

JwtAuthGuard → vérifie le token

AdminGuard → vérifie rôle global

Vérifications supplémentaires dans les services

 Pourquoi Guards + vérifications service ?
Approche	Limite
Guards seuls	Insuffisant pour permissions contextuelles
Service seul	Répétitif

Choix retenu : combinaison des deux

Guard = contrôle d’accès général

Service = règles métier contextualisées (workspaceId, taskId…)

3.3 Premier login sécurisé (reset_password)
 Champ reset_password

Ajout dans le modèle User :

reset_password = 0 → mot de passe temporaire

reset_password = 1 → accès normal

Scénario

Admin crée un utilisateur avec mot de passe temporaire.

À la première connexion :

Login autorisé

Si reset_password = 0, redirection obligatoire vers page changement mot de passe.

Après modification :

reset_password = 1

Pourquoi autoriser le login initial ?

Nous avons besoin d’un utilisateur authentifié (JWT valide) pour sécuriser l’endpoint :

PATCH /auth/first-password


Cela évite d’exposer un endpoint public de modification de mot de passe.

Endpoint dédié
PATCH /auth/first-password


Protégé par :

JwtAuthGuard


Logique :

Vérifie reset_password === 0

Hash du nouveau mot de passe (bcrypt)

Mise à jour reset_password = 1

 Benchmark vs lien reset par email
Méthode	Avantage	Complexité
Email + token	Très sécurisé	SMTP + gestion tokens
reset_password flag	Simple	Moins complet

Choix retenu : reset_password flag

Adapté au délai et cohérent pour un MVP.