export default function MentionsPage() {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mentions légales</h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Qui sommes-nous ?</h2>
          <p>
            Le site <strong>aumitan.com</strong> est géré avec amour au cœur du Limousin
            par <strong>AlgoLife SARL</strong>, à Saint-Julien-le-Petit.
          </p>
          <p>
            Contact : Alexandre Gouy &mdash;{' '}
            <a href="mailto:aumitan@proton.me" className="text-secondary hover:underline">aumitan@proton.me</a>
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Registraire du nom de domaine</h2>
          <p>Le nom de domaine <strong>aumitan.com</strong> est enregistré chez :</p>
          <p>
            <strong>OVH</strong><br />
            Siège social : 2 rue Kellermann, 59100 Roubaix, France<br />
            RCS Lille Métropole 424 761 419<br />
            Site web :{' '}
            <a href="https://www.ovh.com/" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
              https://www.ovh.com/
            </a>
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Hébergeur du site</h2>
          <p>Le site est hébergé par :</p>
          <p>
            <strong>GitHub Pages</strong><br />
            GitHub Inc.<br />
            88 Colin P. Kelly Jr St, San Francisco, CA 94107, USA<br />
            Site web :{' '}
            <a href="https://pages.github.com/" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">
              https://pages.github.com/
            </a>
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Propriété intellectuelle</h2>
          <p>
            Tout le contenu de ce site (textes, images, visuels, sons, etc.) est proposé librement à la
            lecture et à la découverte. Vous pouvez le réutiliser, le partager ou même vous en inspirer
            &mdash; tant que vous mentionnez la source.
          </p>
          <p>
            Le contenu de ce site est mis à disposition selon les termes de la licence{' '}
            <a
              href="https://creativecommons.org/licenses/by-nc/4.0/deed.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              Creative Commons Attribution - Pas d&apos;Utilisation Commerciale 4.0 International (CC BY-NC 4.0)
            </a>.
          </p>
          <p>
            Pour toute demande, contactez-nous à{' '}
            <a href="mailto:aumitan@proton.me" className="text-secondary hover:underline">aumitan@proton.me</a>.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Protection des données personnelles</h2>
          <p>
            Chez aumitan.com, on respecte votre vie privée ! Conformément au Règlement Général sur la
            Protection des Données (RGPD), vous avez un droit d&apos;accès, de modification et de
            suppression de vos données personnelles.
          </p>
          <p>
            Les infos collectées via le site sont exclusivement destinées à AlgoLife SARL et ne seront
            jamais revendues ou partagées avec des tiers.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Cookies</h2>
          <p>
            Bonne nouvelle : <strong>aumitan.com</strong> n&apos;utilise pas de cookies ! Pas de pistage,
            pas de pub, juste du contenu utile.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Responsabilité</h2>
          <p>
            Nous faisons de notre mieux pour vous fournir un site fiable, mais nous ne pouvons garantir
            qu&apos;il soit toujours parfait ! L&apos;utilisation du site se fait sous votre propre responsabilité.
          </p>
          <p>
            Nous ne pouvons donc pas être tenus responsables des dommages directs ou indirects causés à
            l&apos;utilisateur lors de l&apos;utilisation du site <strong>aumitan.com</strong>.
          </p>
          <p>
            Le site peut contenir des liens vers d&apos;autres sites, mais nous ne pouvons pas être tenus
            responsables de leur contenu.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Droit applicable</h2>
          <p>
            Ces mentions légales sont soumises au droit français. En cas de souci juridique, les tribunaux
            compétents seront ceux du ressort du siège social d&apos;AlgoLife SARL.
          </p>
        </div>
      </div>
    </div>
  );
}
