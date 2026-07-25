import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Mentions légales - Mitan',
  description: 'Mentions légales du site aumitan.com, projet bénévole et indépendant.',
};

export default function MentionsPage() {
  return (
    <div className="min-h-screen bg-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mentions légales</h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Qui sommes-nous ?</h2>
          <p>
            <strong>Mitan</strong> est un projet <strong>indépendant et bénévole</strong> : le site{' '}
            <strong>aumitan.com</strong> est conçu, développé et maintenu avec amour par une seule
            personne, au cœur du Limousin. Il est gratuit et indépendant : aucune publicité, aucune
            subvention, aucun financement d&apos;aucun acteur du débat forestier. Il ne vit que du
            temps libre de son auteur &mdash; et du soutien de celles et ceux qui le trouvent utile.
          </p>
          <p>
            Si Mitan vous est utile, vous pouvez contribuer à sa pérennité :{' '}
            <Link href="/soutenir" className="text-secondary hover:underline font-medium">
              💚 Soutenir le projet
            </Link>
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Éditeur du site</h2>
          <p>
            Le site est édité à titre personnel et bénévole par <strong>Alexandre Gouy</strong>,
            à Saint-Julien-le-Petit (Haute-Vienne, France).
          </p>
          <p>
            Directeur de la publication : <strong>Alexandre Gouy</strong><br />
            Contact :{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-secondary hover:underline">{CONTACT_EMAIL}</a>
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
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-secondary hover:underline">{CONTACT_EMAIL}</a>.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Protection des données personnelles</h2>
          <p>
            Chez aumitan.com, on respecte votre vie privée ! Le site ne demande aucune création de
            compte et ne collecte aucune donnée personnelle à des fins commerciales. Aucune donnée
            n&apos;est revendue ni partagée avec des tiers à des fins publicitaires.
          </p>
          <p>
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez
            d&apos;un droit d&apos;accès, de rectification et de suppression des données vous
            concernant. Pour l&apos;exercer, écrivez-nous à{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-secondary hover:underline">{CONTACT_EMAIL}</a>.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Cookies et mesure d&apos;audience</h2>
          <p>
            Le site n&apos;utilise <strong>ni cookies publicitaires, ni pistage commercial</strong>.
          </p>
          <p>
            Pour comprendre comment le site est utilisé et l&apos;améliorer, un outil de mesure
            d&apos;audience (Google Analytics) peut être activé, <strong>uniquement si vous
            l&apos;acceptez</strong> via le bandeau de consentement affiché lors de votre première
            visite. Les adresses IP y sont anonymisées. Si vous refusez, aucun cookie de mesure
            d&apos;audience n&apos;est déposé, et la navigation reste identique.
          </p>
          <p>
            Votre choix est conservé dans votre navigateur. Pour le modifier, effacez les données de
            navigation associées à aumitan.com : le bandeau de consentement vous sera proposé à
            nouveau lors de votre prochaine visite.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8">Responsabilité</h2>
          <p>
            Nous faisons de notre mieux pour vous fournir un site fiable, mais nous ne pouvons garantir
            qu&apos;il soit toujours parfait ! Les informations publiées (cartes, statistiques,
            détections) sont issues de traitements automatisés de données satellite et de travaux
            scientifiques publiés (voir la page{' '}
            <Link href="/details" className="text-secondary hover:underline">Détails sur les données</Link>)
            et sont fournies à titre indicatif. L&apos;utilisation du site se fait sous votre propre
            responsabilité.
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
            Ces mentions légales sont soumises au droit français. En cas de litige, et à défaut de
            résolution amiable, les tribunaux français seront compétents.
          </p>
        </div>
      </div>
    </div>
  );
}
