import { SUPPORT_EMAIL } from '@/constants/support';

/**
 * Textes légaux de YOOTOO — VERSION PROVISOIRE, non contractuelle, à faire valider juridiquement
 * avant le lancement public. Structuré en sections réutilisables (le texte pourra être remplacé
 * sans toucher aux écrans). Formulation prudente, claire, non définitive.
 */

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  title: string;
  subtitle: string;
  intro: string;
  sections: LegalSection[];
}

/** Date affichée (fixe — mettre à jour lors d'une révision du texte). */
export const LEGAL_UPDATED = '9 juillet 2026';

/** Bandeau de prudence affiché en tête des deux documents. */
export const LEGAL_PROVISIONAL =
  'Version provisoire. Ce document sera complété et validé juridiquement avant le lancement public. Il n’a pas, en l’état, de valeur contractuelle définitive.';

export const TERMS: LegalDoc = {
  title: 'Conditions générales d’utilisation',
  subtitle: 'Les règles d’usage de YOOTOO',
  intro:
    'YOOTOO est une application de découverte de la vie locale : commerces, producteurs, artisans, événements et échanges entre habitants d’un territoire. En utilisant YOOTOO, vous acceptez les présentes conditions.',
  sections: [
    {
      heading: '1. Objet',
      body: [
        'YOOTOO met en relation les habitants et les acteurs locaux (commerçants, producteurs, artisans, associations) et facilite la découverte de commerces, produits et événements à proximité.',
        'Le service est proposé « en l’état » et est susceptible d’évoluer.',
      ],
    },
    {
      heading: '2. Compte utilisateur',
      body: [
        'La création d’un compte peut se faire via Google, Apple ou par lien e-mail. Vous êtes responsable de la confidentialité de vos accès et des activités réalisées depuis votre compte.',
        'Vous vous engagez à fournir des informations exactes. Un compte peut être créé par toute personne capable de contracter ; les mineurs doivent utiliser l’application sous la responsabilité d’un parent ou tuteur.',
      ],
    },
    {
      heading: '3. Utilisation du service',
      body: [
        'Vous pouvez notamment rechercher des commerces, consulter la carte, enregistrer des favoris et participer aux échanges de la communauté (« Chat »).',
        'Vous vous engagez à un usage loyal du service et à ne pas en perturber le fonctionnement.',
      ],
    },
    {
      heading: '4. Communauté et contenus',
      body: [
        'L’espace d’échange doit rester bienveillant et utile. Sont notamment interdits les contenus illégaux, haineux, trompeurs, ou constituant du spam.',
        'YOOTOO peut modérer, masquer ou retirer un contenu, et suspendre un compte en cas de manquement, dans le respect de la réglementation applicable.',
      ],
    },
    {
      heading: '5. Informations sur les commerces',
      body: [
        'Les informations relatives aux commerces (coordonnées, photos, catégories, disponibilités) sont fournies à titre indicatif et peuvent comporter des inexactitudes.',
        'YOOTOO ne garantit pas l’exhaustivité, l’exactitude ou la disponibilité permanente de ces informations.',
      ],
    },
    {
      heading: '6. Propriété intellectuelle',
      body: [
        'La marque YOOTOO, l’application et ses contenus sont protégés. Toute reproduction non autorisée est interdite.',
        'Les contenus que vous publiez restent les vôtres ; vous accordez à YOOTOO les droits nécessaires à leur affichage au sein du service.',
      ],
    },
    {
      heading: '7. Responsabilité',
      body: [
        'Le service est fourni sans garantie de disponibilité continue. Dans la mesure permise par la loi, la responsabilité de YOOTOO est limitée.',
        'Les échanges et transactions avec les commerces se font sous votre responsabilité et celle des commerçants concernés.',
      ],
    },
    {
      heading: '8. Évolution et résiliation',
      body: [
        'YOOTOO peut faire évoluer le service et les présentes conditions. Les évolutions notables seront portées à votre connaissance.',
        'Vous pouvez à tout moment cesser d’utiliser le service et demander la suppression de votre compte depuis les Réglages.',
      ],
    },
    {
      heading: '9. Droit applicable',
      body: [
        'Sauf disposition impérative contraire, les présentes conditions sont soumises au droit français.',
      ],
    },
    {
      heading: '10. Contact',
      body: [`Pour toute question relative à ces conditions : ${SUPPORT_EMAIL}.`],
    },
  ],
};

export const PRIVACY: LegalDoc = {
  title: 'Politique de confidentialité',
  subtitle: 'Comment YOOTOO traite vos données',
  intro:
    'La protection de vos données est essentielle pour YOOTOO. Cette politique explique quelles données sont traitées, pourquoi, et quels sont vos droits.',
  sections: [
    {
      heading: '1. Responsable du traitement',
      body: [`YOOTOO est responsable du traitement des données collectées via l’application. Contact : ${SUPPORT_EMAIL}.`],
    },
    {
      heading: '2. Données collectées',
      body: [
        'Compte : nom d’affichage, e-mail et, le cas échéant, photo de profil.',
        'Usage : favoris, préférences d’affichage et de notifications, interactions dans le Chat.',
        'Localisation : votre position approximative, uniquement avec votre autorisation, pour afficher les commerces à proximité.',
        'Données techniques : informations d’appareil et journaux nécessaires au bon fonctionnement et à la sécurité.',
      ],
    },
    {
      heading: '3. Finalités',
      body: [
        'Fournir et personnaliser la découverte locale (carte, recommandations, favoris).',
        'Permettre les échanges communautaires et vous envoyer, le cas échéant, les notifications que vous avez activées.',
        'Assurer la sécurité, prévenir les abus et améliorer le service.',
      ],
    },
    {
      heading: '4. Bases légales',
      body: [
        'Selon les cas : l’exécution du service, votre consentement (notamment pour la géolocalisation et les notifications), et l’intérêt légitime de YOOTOO à améliorer et sécuriser l’application.',
      ],
    },
    {
      heading: '5. Partage des données',
      body: [
        'Vos données peuvent être traitées par des prestataires techniques agissant pour le compte de YOOTOO, notamment pour l’hébergement et l’authentification (Supabase) et la cartographie (Mapbox).',
        'YOOTOO ne vend pas vos données personnelles.',
      ],
    },
    {
      heading: '6. Conservation',
      body: [
        'Vos données sont conservées le temps nécessaire aux finalités décrites, puis supprimées ou anonymisées. Vous pouvez demander la suppression de votre compte à tout moment.',
      ],
    },
    {
      heading: '7. Vos droits',
      body: [
        'Vous disposez notamment des droits d’accès, de rectification, d’effacement, d’opposition et de portabilité de vos données.',
        `Pour exercer ces droits, écrivez à ${SUPPORT_EMAIL}. Les demandes d’export ou de suppression sont également accessibles depuis les Réglages.`,
      ],
    },
    {
      heading: '8. Géolocalisation',
      body: [
        'La localisation sert uniquement à afficher les contenus proches de vous. Vous pouvez l’activer ou la désactiver à tout moment dans les réglages de votre appareil.',
      ],
    },
    {
      heading: '9. Sécurité',
      body: ['YOOTOO met en œuvre des mesures raisonnables pour protéger vos données contre tout accès non autorisé.'],
    },
    {
      heading: '10. Mineurs',
      body: ['L’application n’est pas destinée aux enfants sans l’accord et la supervision d’un parent ou tuteur.'],
    },
    {
      heading: '11. Modifications',
      body: ['Cette politique pourra être mise à jour. Les évolutions notables seront portées à votre connaissance.'],
    },
    {
      heading: '12. Contact',
      body: [`Pour toute question relative à vos données : ${SUPPORT_EMAIL}.`],
    },
  ],
};
