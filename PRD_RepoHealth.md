# PRD — RepoHealth

**Nom du fichier :** `PRD_RepoHealth.md`  
**Version :** 1.0  
**Date :** 12 octobre 2026  
**Auteur :** @Sky  
**Statut :** Prêt pour développement  
**Orchestrateur :** Sky

---

## 1. Résumé du produit

RepoHealth est un outil web gratuit qui analyse la santé d’un dépôt GitHub public et lui attribue un score sur 100, accompagné d’une note allant de A+ à F.

L’application fonctionne entièrement dans le navigateur, sans installation, sans ligne de commande et sans backend propriétaire. Elle est hébergée sur GitHub Pages et propose une interface en français et en anglais.

Le rapport présente le score global, les résultats par pilier, des recommandations classées par impact et un badge SVG intégrable dans le README du dépôt analysé.

## 2. Problème et opportunité

Lorsqu’un développeur, un recruteur, un CTO ou un investisseur souhaite évaluer un dépôt GitHub, les informations disponibles ne suffisent pas toujours à obtenir rapidement une vue d’ensemble de sa qualité.

Le profil communautaire de GitHub vérifie notamment la présence de certains fichiers, mais ne fournit pas à lui seul une évaluation synthétique de la documentation, de l’automatisation, de l’activité, de la qualité du code et des pratiques de sécurité.

De nombreux outils comparables sont des interfaces en ligne de commande, des extensions ou des services nécessitant un backend. RepoHealth vise à proposer une alternative simple et transparente.

### Proposition de valeur

- Un score global compréhensible sur 100.
- Une évaluation organisée en sept piliers.
- Des recommandations concrètes et priorisées.
- Une interface bilingue français/anglais.
- Un badge SVG partageable.
- Une utilisation gratuite, sans compte et sans backend RepoHealth.

## 3. Utilisateurs cibles

RepoHealth s’adresse aux utilisateurs francophones et anglophones, sur ordinateur, tablette et mobile.

1. **Développeurs open source :** vérifier la qualité de leur dépôt avant une publication, une release ou une candidature.
2. **Recruteurs et CTO :** obtenir une première indication de la qualité et de la maintenance d’un projet.
3. **Investisseurs et analystes :** réaliser une première évaluation technique d’un projet open source.
4. **Mainteneurs :** repérer les faiblesses du dépôt et prioriser les améliorations.

## 4. Périmètre fonctionnel

### 4.1 Fonctionnalités de la V1

| Fonctionnalité | Priorité | Exigences |
|---|---|---|
| Saisie d’un dépôt | P0 | Accepter une URL GitHub ou un couple `owner/repo`, avec validation et erreurs explicites. |
| Analyse via l’API GitHub | P0 | Utiliser l’API publique en lecture seule et limiter les requêtes par analyse. |
| Moteur de scoring | P0 | Calculer un score sur 100 selon sept piliers pondérés. |
| Rapport visuel | P0 | Afficher score global, grade, détails par pilier et indicateurs lisibles. |
| Recommandations | P0 | Présenter les améliorations par impact estimé, avec une explication claire. |
| Interface FR/EN | P0 | Détecter la langue du navigateur et proposer un sélecteur manuel mémorisé localement. |
| Méthodologie publique | P0 | Documenter les règles, les limites et les pondérations dans le dépôt. |
| Badge SVG | P1 | Générer un badge intégrable au README et renvoyant vers RepoHealth. |
| Thème clair/sombre | P1 | Suivre le système par défaut et mémoriser la préférence choisie. |
| Interface responsive | P1 | Rester utilisable sur mobile, tablette et ordinateur. |
| Export JSON | P2 | Permettre le téléchargement du rapport structuré. |

### 4.2 Hors périmètre de la V1

- Comptes et authentification des utilisateurs.
- Analyse des dépôts privés.
- Historique distant ou synchronisé des scores.
- Comparaison de plusieurs dépôts.
- API publique RepoHealth.
- Export PDF.
- Tableau de bord d’équipe.
- Alertes automatiques et intégrations CI/CD avancées.

## 5. Plateformes et compatibilité

RepoHealth est une application web. Elle fonctionne dans les navigateurs modernes compatibles avec les API Web utilisées, notamment Chrome, Firefox, Edge, Safari et Brave, sur Windows, Linux, macOS, Android et iOS.

Aucune application desktop ou mobile native n’est prévue pour la V1.

### Priorités de test

- Chrome et Edge sous Windows.
- Firefox et Chrome sous Linux.
- Safari sous macOS et iOS.
- Chrome sous Android.

L’interface est conçue selon une approche mobile-first. Le formulaire de saisie et l’analyse doivent également être confortables sur ordinateur.

## 6. Exigences techniques

### 6.1 Architecture

- **Hébergement :** GitHub Pages.
- **Déploiement :** GitHub Actions.
- **Technologies :** HTML, CSS et JavaScript natifs, sans framework lourd.
- **Backend RepoHealth :** aucun.
- **Source de données :** GitHub REST API, en lecture seule.
- **Dépendances runtime :** aucune dépendance externe non essentielle.
- **Test local :** utiliser un serveur HTTP local ; l’ouverture directe via `file://` peut empêcher le chargement des modules JavaScript.

### 6.2 Cache et préférences

- Mettre en cache les réponses ou résultats compatibles pendant 15 minutes par défaut, dans la limite des règles de fraîcheur des données.
- Utiliser `localStorage` pour les préférences et les analyses récentes.
- Signaler dans le rapport lorsque des données proviennent du cache et permettre à l’utilisateur de forcer leur actualisation.
- Gérer les erreurs réseau, les réponses invalides, les dépôts inexistants et les limites de débit de l’API GitHub.
- Ne pas conserver de jeton GitHub dans la V1.

### 6.3 Confidentialité et sécurité

- Aucun compte utilisateur requis.
- Aucun cookie de suivi ni outil d’analytics tiers.
- Aucune transmission des données d’analyse à un serveur RepoHealth.
- Limiter les requêtes réseau aux services nécessaires, principalement l’API GitHub.
- Définir une politique de sécurité du contenu (CSP) adaptée à l’architecture GitHub Pages.
- Traiter les données renvoyées par GitHub comme des données non fiables : ne jamais injecter directement leur contenu dans le DOM comme du HTML.
- Documenter clairement les données conservées localement et permettre à l’utilisateur de les effacer.

### 6.4 Accessibilité et performance

- Navigation complète au clavier.
- Contrastes suffisants et focus visible.
- Libellés accessibles pour les champs et contrôles.
- Structure sémantique et prise en charge des lecteurs d’écran.
- Objectif : afficher un rapport en moins de 10 secondes sur une connexion mobile moyenne, lorsque l’API GitHub répond normalement.
- Afficher un état de chargement et des messages d’erreur compréhensibles.

### 6.5 Qualité

Les tests automatisés exécutés par GitHub Actions doivent couvrir au minimum :

- Le parsing et la validation des URL GitHub.
- Le calcul du score global et des grades.
- Le calcul des sept piliers.
- Les cas de données manquantes ou inaccessibles.
- La génération du badge SVG.
- La gestion des erreurs de l’API et du cache.

## 7. Moteur de scoring

Le score global est compris entre 0 et 100. Chaque pilier reçoit une note de 0 à 100, puis contribue au résultat final selon son poids.

| # | Pilier | Poids | Éléments évalués |
|---:|---|---:|---|
| 1 | Documentation | 20 % | Présence et structure du README, exemples d’utilisation, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SUPPORT et CHANGELOG. |
| 2 | CI/CD et automatisation | 15 % | Workflows GitHub Actions, tests automatisés, linting, releases automatisées, configuration Dependabot ou Renovate. |
| 3 | Sécurité | 20 % | SECURITY.md, signaux de sécurité accessibles via l’API, configuration des dépendances et protections observables. |
| 4 | Activité et maintenance | 15 % | Date du dernier commit, activité récente, releases et informations accessibles sur les issues. |
| 5 | Communauté | 10 % | Nombre de contributeurs observable, templates d’issues et de pull requests, signaux d’activité communautaire. |
| 6 | Qualité du code | 10 % | Présence de tests, configuration de couverture si détectable, linters, formatters et structure du projet. |
| 7 | Hygiène du dépôt | 10 % | `.gitignore`, description, topics, taille du dépôt et détection de fichiers volumineux lorsque les données disponibles le permettent. |

### 7.1 Grades

| Score | Grade |
|---:|:---:|
| 90–100 | A+ |
| 80–89,99 | A |
| 70–79,99 | B |
| 60–69,99 | C |
| 50–59,99 | D |
| 0–49,99 | F |

Le score est arrondi pour l’affichage. Les seuils sont appliqués à la valeur non arrondie.

### 7.2 Principes de calcul

- Chaque règle doit avoir une définition, un poids et une justification documentés.
- Les règles doivent être déterministes et testables.
- Une information inaccessible via l’API ne doit pas être présentée comme vérifiée.
- Une fonctionnalité absente ne doit être pénalisée que si sa vérification est pertinente pour le dépôt.
- Les recommandations doivent correspondre à des règles ayant contribué au score.
- Les points potentiellement gagnés sont des estimations, pas une garantie de résultat.
- Les critères qui ne peuvent pas être vérifiés doivent être marqués « non vérifiables » ou « données insuffisantes », plutôt que considérés automatiquement comme des échecs.
- La méthodologie est publique et peut évoluer selon les retours, avec une version explicite du moteur.

### 7.3 Limites de l’évaluation de sécurité

RepoHealth ne peut pas prétendre effectuer un audit de sécurité complet à partir des seules informations publiques de l’API GitHub. Les alertes de vulnérabilité, secrets exposés et règles de protection ne sont pas toutes accessibles sans autorisations particulières.

La V1 doit donc distinguer les **signaux de sécurité observables** des contrôles impossibles à confirmer. Elle ne doit jamais affirmer qu’un dépôt est sécurisé uniquement parce qu’aucun problème n’a été détecté.

## 8. Données, confidentialité et conformité

- Utiliser la documentation publique de l’API REST GitHub comme source principale.
- Ne collecter aucune donnée personnelle à des fins de suivi.
- Ne pas créer de compte utilisateur ni utiliser de cookies de suivi.
- Afficher la date et l’heure de l’analyse ainsi que la version du moteur de scoring.
- Expliquer les limites de disponibilité et de fraîcheur des données.
- Afficher un avertissement indiquant que le score constitue une aide à la décision et ne remplace ni une revue humaine du code ni un audit professionnel de sécurité.
- Publier la méthodologie et ses limites dans l’interface et dans le dépôt.

### Gestion du rate limit

Les limites de l’API GitHub peuvent empêcher certaines analyses, notamment en cas d’utilisation intensive ou de cache insuffisant. L’application doit :

1. Réutiliser les données mises en cache lorsqu’elles sont encore valides.
2. Limiter les requêtes au strict nécessaire.
3. Détecter les réponses de limitation de débit et respecter les indications de GitHub.
4. Présenter un message explicite lorsque l’analyse doit être reportée.

Un jeton GitHub facultatif est envisagé pour une version ultérieure. Si cette option est développée, le stockage local, les risques et les limites de sécurité devront être expliqués clairement.

## 9. Découvrabilité sur GitHub

### Dépôt

Nom proposé : `repohealth` — à confirmer avant la création du dépôt.

Description proposée :  
**FR :** « Évaluez la santé des dépôts GitHub avec un score transparent, des recommandations et un badge SVG. »  
**EN :** “Assess GitHub repository health with a transparent score, actionable recommendations, and an SVG badge.”

### Topics suggérés

`github`, `repo-health`, `repository-analysis`, `code-quality`, `developer-tools`, `open-source`, `github-api`, `github-pages`, `bilingual`

### Documentation et partage

- Maintenir un `README.md` en anglais avec un lien vers la documentation française.
- Fournir une documentation française avec un lien vers la version anglaise.
- Renseigner l’URL GitHub Pages dans le champ **Website** du dépôt.
- Prévoir une image d’aperçu social.
- Générer un badge SVG dont le lien mène vers la page RepoHealth correspondant au dépôt analysé.

## 10. Feuille de route sur 14 jours

Chaque journée doit produire un livrable identifiable, un commit et une note de progression dans le README ou le journal de développement.

| Jour | Livrable | Dépendance |
|---:|---|---|
| 1 | Squelette du dépôt, bascule FR/EN, intégration continue et structure de l’application | Aucune |
| 2 | Client GitHub API, cache et gestion du rate limit | Jour 1 |
| 3 | Moteur de scoring : documentation | Jour 2 |
| 4 | Moteur de scoring : CI/CD, sécurité et activité | Jour 3 |
| 5 | Moteur de scoring : communauté, qualité du code et hygiène | Jour 4 |
| 6 | Rapport visuel : score, grade et détail par pilier | Jour 5 |
| 7 | Publication de la version v0.1 et README bilingue | Jours 1 à 6 |
| 8 | Recommandations actionnables classées par impact | v0.1 |
| 9 | Génération du badge SVG | v0.1 |
| 10 | Thème clair/sombre et interface responsive | v0.1 |
| 11 | Export JSON du rapport | v0.1 |
| 12 | Étude et, si validée, implémentation d’un jeton GitHub facultatif | v0.1 |
| 13 | Historique local des analyses | Jour 12 |
| 14 | Bilan des retours, corrections et préparation de la v0.2 | Jours 1 à 13 |

La priorité reste la fiabilité de l’analyse et la transparence du scoring. Les fonctionnalités P2 ou les options risquées peuvent être reportées si elles compromettent la qualité de la V1.

## 11. Monétisation éventuelle

Le produit reste gratuit au lancement. Aucune monétisation ne sera mise en place avant l’existence d’une utilisation régulière et de retours utilisateurs suffisants.

| Offre envisagée | Prix indicatif | Fonctionnalités potentielles |
|---|---:|---|
| Gratuit | 0 € | Analyse d’un dépôt public, score, recommandations et badge SVG. |
| Pro | 9 €/mois | Analyse multi-dépôts, exports avancés et historique étendu. |
| Team | 29 €/mois | Tableau de bord d’équipe, alertes et fonctionnalités collaboratives. |
| API | À définir | Accès programmatique et intégrations CI/CD. |

Autres pistes à étudier : GitHub Sponsors, rapports de due diligence technique et formations courtes pour les équipes.

Ces prix et fonctionnalités sont des hypothèses à valider. L’analyse des dépôts privés, l’accès API et les fonctionnalités d’équipe nécessiteraient une architecture et des contrôles d’accès supplémentaires, incompatibles avec le seul modèle statique de la V1.

## 12. Indicateurs de succès

Les objectifs ci-dessous sont des cibles proposées, et non des résultats garantis.

| Indicateur | Cible à 3 mois | Cible à 12 mois |
|---|---:|---:|
| Étoiles GitHub | 100 | 1 000 |
| Issues et demandes utilisateurs | 10 | 100 |
| Badges présents dans des README | 50 | 500 |
| Analyses publiques observables via les badges | 500 | 5 000 |

RepoHealth ne met pas en place de suivi individuel des utilisateurs. Les indicateurs doivent être collectés uniquement à partir de sources publiques ou de statistiques agrégées compatibles avec la politique de confidentialité. Les statistiques GitHub Pages ayant une période de conservation limitée, elles peuvent être relevées régulièrement.

## 13. Risques et mesures d’atténuation

| Risque | Mesure d’atténuation |
|---|---|
| Limites de débit de l’API GitHub | Cache, réduction des requêtes, gestion des erreurs et messages explicites. |
| Faux positifs dans le scoring | Méthodologie ouverte, règles testées, retours utilisateurs et révisions versionnées. |
| Données insuffisantes pour certains critères | Afficher l’incertitude et ne pas assimiler une absence de données à un échec. |
| Confusion entre score et audit de sécurité | Avertissement visible et distinction entre signaux observables et contrôles non vérifiables. |
| Évolution de l’API GitHub | Suivre la version d’API recommandée, centraliser le client et maintenir des tests automatisés. |
| Dépôt privé ou inexistant | Détecter le cas et afficher un message clair : seuls les dépôts publics sont pris en charge. |
| Score bas décourageant | Utiliser un ton constructif et fournir des recommandations concrètes. |
| Coût de maintenance du projet | Limiter les dépendances et garder une architecture simple. |

## 14. Critères d’acceptation de la V1

La V1 est considérée comme prête lorsque :

- L’utilisateur peut saisir une URL GitHub ou `owner/repo`.
- Les entrées incorrectes et dépôts non accessibles produisent des messages compréhensibles.
- L’analyse d’un dépôt public génère un score global et un grade.
- Les sept piliers apparaissent avec leur score, leur poids et une explication.
- Les données non vérifiables sont signalées honnêtement.
- Les recommandations sont cohérentes avec les règles du scoring.
- L’interface peut être utilisée en français et en anglais.
- Le badge SVG généré est valide et intégrable dans un README.
- Le site fonctionne sur les navigateurs prioritaires et sur mobile.
- Les tests automatisés passent dans GitHub Actions.
- Le déploiement GitHub Pages est documenté et reproductible.
- Les limites de l’outil et son absence de valeur d’audit professionnel sont visibles.

## 15. Questions ouvertes

1. Quel nom définitif retenir : `repohealth`, `repo-health` ou `github-health` ?
2. Les sept piliers et leurs pondérations doivent-ils être ajustés après les premiers retours ?
3. Une analyse rapide avec moins de requêtes est-elle nécessaire ?
4. Le badge doit-il afficher uniquement le score, ou également le grade ?
5. Quelles langues et quels exemples doivent être prioritaires dans la documentation ?
6. Quels critères de scoring peuvent être évalués de façon fiable sans jeton ni autorisations supplémentaires ?

## 16. Sources et références

Documentation à consulter pendant le développement :

- GitHub REST API : https://docs.github.com/en/rest
- API de profil communautaire : https://docs.github.com/en/rest/metrics/community
- Limites de débit de l’API : https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- GitHub Pages : https://docs.github.com/en/pages
- GitHub Actions : https://docs.github.com/en/actions

Les noms d’outils concurrents et les données de marché mentionnés dans les notes de recherche initiales doivent être vérifiés à partir de sources datées avant d’être repris comme faits dans la documentation publique. Ils ne sont pas nécessaires à la réalisation du MVP.

---

**Fin du document — `PRD_RepoHealth.md`**
