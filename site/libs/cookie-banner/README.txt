Consent Manager Installation Instructions

1. Extract the contents of this zip file
2. Place the files in your website directory
3. Add the following code to your HTML page, inside the <head> tag:

<link rel="stylesheet" id="silktide-consent-manager-css" href="path-to-css/silktide-consent-manager.css">
<script src="path-to-js/silktide-consent-manager.js"></script>
<script>
silktideCookieBannerManager.updateCookieBannerConfig({
  background: {
    showBackground: false
  },
  cookieIcon: {
    position: "bottomRight"
  },
  cookieTypes: [
    {
      id: "n_cessaires",
      name: "Nécessaires",
      description: "<div>Ces cookies sont nécessaires au fonctionnement du site web et ne peuvent pas être désactivés. Ils aident à la définition de vos préférences en matière de confidentialité.</div>",
      required: true,
      onAccept: function() {
        console.log('Add logic for the required Nécessaires here');
      }
    },
    {
      id: "analytiques",
      name: "Analytiques",
      description: "<div>Ces cookies nous aident à améliorer le site en suivant quelles pages sont les plus populaires et comment les visiteurs naviguent sur le site.</div>",
      required: false,
      onAccept: function() {
        gtag('consent', 'update', {
          analytics_storage: 'granted',
        });
        dataLayer.push({
          'event': 'consent_accepted_analytiques',
        });
      },
      onReject: function() {
        gtag('consent', 'update', {
          analytics_storage: 'denied',
        });
      }
    }
  ],
  text: {
    banner: {
      description: "<div>Nous utilisons des cookies sur notre site pour améliorer votre expérience utilisateur et analyser notre trafic.</div>",
      acceptAllButtonText: "Accepter tout",
      acceptAllButtonAccessibleLabel: "Accepter tous les cookies",
      rejectNonEssentialButtonText: "Rejeter les non-essentiels",
      rejectNonEssentialButtonAccessibleLabel: "Rejeter les non-essentiels",
      preferencesButtonText: "Préférences",
      preferencesButtonAccessibleLabel: "Préférences"
    },
    preferences: {
      title: "Personnalisez vos préférences en matière de cookies",
      description: "<div>Nous respectons votre droit à la vie privée. Vous pouvez choisir de ne pas autoriser certains types de cookies. Vos préférences en matière de cookies s'appliqueront à l'ensemble de notre site web.</div>",
      creditLinkText: "Obtenez cette bannière",
      creditLinkAccessibleLabel: "Obtenez cette bannière"
    }
  }
});
</script>
