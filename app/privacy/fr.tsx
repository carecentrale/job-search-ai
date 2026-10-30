import Link from "next/link";
import LegalPage, { ContactEmail } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

const mail = <ContactEmail />;

/** Politique de confidentialité, version française (Québec). Même contenu que la version anglaise. */
export function PrivacyFr() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      summary={
        <ul>
          <li>Nous utilisons votre CV et votre mandat uniquement pour trouver des emplois pour vous et rédiger vos candidatures.</li>
          <li>Nous ne vendons pas vos données, ne vous montrons pas de publicité et ne les communiquons ni aux employeurs ni aux recruteurs. Rien n&apos;est envoyé à un employeur, sauf si vous l&apos;envoyez vous-même.</li>
          <li>Si vous vous abonnez, Stripe traite votre paiement. Nous ne voyons jamais votre numéro de carte.</li>
          <li>Pour rédiger et analyser, nous transmettons votre CV, votre mandat et les offres d&apos;emploi à un fournisseur d&apos;IA : Anthropic, ou OpenAI si vous ajoutez une clé OpenAI. Nous n&apos;utilisons pas vos données pour entraîner des modèles d&apos;IA.</li>
          <li>Vos données sont hébergées aux États-Unis. Vous pouvez les télécharger ou supprimer votre compte en tout temps à partir de <strong>Forfait</strong>, dans votre espace de travail.</li>
        </ul>
      }
    >
      <h2>1. Qui nous sommes</h2>
      <p>
        {LEGAL.product} (« nous ») est un assistant personnel de recherche d&apos;emploi exploité par {LEGAL.operator}, établi à Montréal (Québec), Canada. La présente politique s&apos;applique au site {LEGAL.site.replace("https://", "")} et à l&apos;espace de travail {LEGAL.product}.
      </p>
      <p>
        La personne responsable de la protection des renseignements personnels chez {LEGAL.product} est {LEGAL.privacyOfficer}. Vous pouvez la joindre à {mail} pour toute question, demande ou plainte concernant vos renseignements personnels.
      </p>
      <p>
        La présente politique vise à respecter la <em>Loi sur la protection des renseignements personnels et les documents électroniques</em> (LPRPDE) du Canada, la <em>Loi sur la protection des renseignements personnels dans le secteur privé</em> du Québec (telle que modifiée par la Loi 25), ainsi que les lois sur la protection de la vie privée des États américains qui s&apos;appliquent à nous.
      </p>

      <h2>2. Ce que nous recueillons</h2>
      <table className="legal-table">
        <thead><tr><th>Quoi</th><th>Source</th><th>Pourquoi</th></tr></thead>
        <tbody>
          <tr><td data-label="Quoi">Votre nom, votre adresse courriel et vos informations de connexion</td><td data-label="Source">Vous, à l&apos;inscription, par l&apos;intermédiaire de notre fournisseur de connexion Clerk (y compris la connexion Google, si vous l&apos;utilisez)</td><td data-label="Pourquoi">Créer et sécuriser votre compte</td></tr>
          <tr><td data-label="Quoi">Votre CV, au complet</td><td data-label="Source">Vous, lorsque vous le téléversez ou le collez</td><td data-label="Pourquoi">Vous suggérer un mandat, vous proposer des offres et rédiger des CV et lettres de présentation adaptés</td></tr>
          <tr><td data-label="Quoi">Votre mandat : postes recherchés, forces, villes, préférence pour le travail à distance, éléments à éviter</td><td data-label="Source">Vous, ou suggéré par l&apos;IA à partir de votre CV pour que vous le modifiiez</td><td data-label="Pourquoi">Choisir les offres à vous montrer</td></tr>
          <tr><td data-label="Quoi">Votre présélection, les offres écartées, votre suivi, vos notes, vos dates d&apos;entrevue, les entreprises suivies et les liens d&apos;offres que vous ajoutez</td><td data-label="Source">Vous, et notre recherche quotidienne</td><td data-label="Pourquoi">Mener votre recherche d&apos;emploi et vous rappeler de relancer</td></tr>
          <tr><td data-label="Quoi">Les CV, lettres de présentation, analyses IA et scores que nous produisons</td><td data-label="Source">Nos fournisseurs d&apos;IA, à partir de vos renseignements</td><td data-label="Pourquoi">Vous permettre de les relire, de les modifier et de les utiliser</td></tr>
          <tr><td data-label="Quoi">Renseignements de facturation, si vous vous abonnez : votre forfait, la devise, l&apos;état de l&apos;abonnement, la date de renouvellement et toute pause. Si vous nous dites avoir décroché un emploi, l&apos;entreprise et le poste que vous indiquez</td><td data-label="Source">Vous, par le paiement de Stripe. Vos renseignements de carte vont directement à Stripe; nous ne voyons ni ne conservons jamais votre numéro de carte</td><td data-label="Pourquoi">Fournir et facturer le forfait Personnel</td></tr>
          <tr><td data-label="Quoi">Votre propre clé IA, si vous en ajoutez une</td><td data-label="Source">Vous</td><td data-label="Pourquoi">Faire fonctionner l&apos;IA avec votre compte. Elle est chiffrée (AES-256-GCM) et n&apos;est plus jamais affichée; nous n&apos;en montrons que les 4 derniers caractères</td></tr>
          <tr><td data-label="Quoi">Un journal d&apos;activité : ce que vous avez fait dans l&apos;application et quand (par exemple « CV téléversé », « offre approuvée »), les écrans et documents que vous avez ouverts, ainsi que le nombre de demandes et de jetons d&apos;IA</td><td data-label="Source">Enregistré automatiquement pendant votre utilisation</td><td data-label="Pourquoi">Appliquer les limites de la semaine gratuite, vous aider, prévenir les abus et comprendre l&apos;utilisation du produit</td></tr>
          <tr><td data-label="Quoi">Données techniques : adresse IP, type de navigateur et d&apos;appareil, journaux de requêtes</td><td data-label="Source">Enregistrées automatiquement par nos fournisseurs d&apos;hébergement et de connexion</td><td data-label="Pourquoi">Sécurité, prévention de la fraude et bon fonctionnement du service</td></tr>
          <tr><td data-label="Quoi">Votre pays et votre province, déterminés à partir de votre adresse IP</td><td data-label="Source">Notre hébergeur, à chaque visite</td><td data-label="Pourquoi">Afficher le site en français au Québec, afficher le prix du forfait Personnel dans votre devise et vérifier qu&apos;il est offert là où vous êtes. Nous ne les conservons pas, sauf le pays enregistré au début d&apos;un paiement</td></tr>
          <tr><td data-label="Quoi">Votre choix de langue</td><td data-label="Source">Vous, avec le sélecteur EN/FR, conservé dans un témoin (cookie) sur votre appareil, et associé à votre compte</td><td data-label="Pourquoi">Afficher le site dans votre langue et rédiger les analyses de l&apos;IA dans cette langue</td></tr>
          <tr><td data-label="Quoi">Statistiques de visite anonymes : pages consultées, site d&apos;origine, pays, type de navigateur et d&apos;appareil</td><td data-label="Source">Vercel Web Analytics, sur toutes les pages sauf l&apos;espace d&apos;administration</td><td data-label="Pourquoi">Savoir combien de personnes visitent le site et quelles pages sont utiles. Ces statistiques ne sont pas liées à votre compte</td></tr>
        </tbody>
      </table>
      <p>
        Nous ne demandons pas, et vous ne devriez pas inclure dans votre CV, de renseignements sensibles dont les employeurs n&apos;ont pas besoin : numéro d&apos;assurance sociale ou d&apos;une pièce d&apos;identité, date de naissance, renseignements de santé, photos ou coordonnées bancaires. Si votre CV en contient, ils sont traités comme le reste de votre CV.
      </p>
      <p>
        La démo à l&apos;adresse <Link href="/app">/app</Link>, utilisée sans connexion, conserve tout dans votre propre navigateur et ne nous transmet rien.
      </p>

      <h2>3. Témoins (cookies) et technologies semblables</h2>
      <p>
        Nous utilisons uniquement les témoins nécessaires pour vous garder connecté, placés par Clerk, et un témoin qui retient votre choix de langue. Nous n&apos;utilisons pas de témoins publicitaires ni aucune technologie qui établit votre profil à des fins de marketing.
      </p>
      <p>
        Nous comptons les visites avec Vercel Web Analytics, qui n&apos;utilise aucun témoin et ne vous identifie pas. Il reconnaît les requêtes répétées au cours d&apos;une même journée grâce à un code temporaire tiré de votre requête, supprimé après 24 heures. Il ne voit que des chiffres globaux, jamais votre CV ni les renseignements de votre compte. Dans votre espace de travail, nous enregistrons aussi les écrans que vous ouvrez, dans le journal d&apos;activité décrit à la section 2. Le site charge ses polices de caractères à partir de Google Fonts, qui reçoit donc votre adresse IP au chargement de la page.
      </p>

      <h2>4. Comment l&apos;IA utilise vos renseignements</h2>
      <p>
        {LEGAL.product} utilise l&apos;intelligence artificielle de quatre façons. Chacune transmet votre CV, votre mandat et le texte de l&apos;offre d&apos;emploi au fournisseur d&apos;IA :
      </p>
      <ul>
        <li><strong>Suggérer votre mandat</strong> à partir de votre CV, pour que vous le modifiiez.</li>
        <li><strong>Analyser les offres.</strong> Notre système attribue d&apos;abord un score aux offres selon les mots-clés de votre mandat : titres de poste, forces, villes, travail à distance et éléments à éviter. L&apos;IA lit ensuite les meilleures offres par rapport à votre CV et classe chacune comme Recommandée, À considérer ou À écarter, avec un score de 0 à 100 et ses raisons.</li>
        <li><strong>Rédiger un CV et une lettre de présentation adaptés</strong> à une offre, uniquement à partir des faits de votre CV. Elle indique les lacunes au lieu d&apos;inventer de l&apos;expérience.</li>
        <li><strong>Lire une page d&apos;offre</strong> que vous collez, lorsque la page ne contient pas de données d&apos;offre structurées.</li>
      </ul>
      <p>
        Il s&apos;agit de recommandations qui vous sont faites, et non de décisions prises à votre sujet. Vous choisissez ce que vous approuvez, et nous n&apos;envoyons jamais rien à un employeur. Si vous activez le <strong>pilote automatique</strong>, nous approuvons, selon vos instructions, les postes que l&apos;IA recommande au-delà du score et de la limite quotidienne que vous fixez, et nous en rédigeons les documents. Vous pouvez le désactiver en tout temps. Vous pouvez nous demander quels renseignements et quels facteurs ont mené à une recommandation, et corriger en tout temps les renseignements de votre CV ou de votre mandat.
      </p>
      <p>
        <strong>Quel fournisseur d&apos;IA.</strong> Si vous n&apos;avez pas ajouté votre propre clé, nous utilisons Claude, d&apos;Anthropic, avec notre compte. Si vous ajoutez une clé Claude, Anthropic traite vos demandes avec votre compte; si vous ajoutez une clé OpenAI, c&apos;est OpenAI qui les traite. Nous utilisons leurs services d&apos;API pour entreprises, et non leurs applications de clavardage grand public. Selon leurs conditions commerciales publiées, Anthropic et OpenAI n&apos;utilisent pas les données transmises par l&apos;API pour entraîner leurs modèles par défaut, et les conservent pendant une période limitée à des fins de sécurité et de détection des abus. Consultez les <a href="https://www.anthropic.com/legal/commercial-terms" target="_blank" rel="noopener noreferrer">conditions commerciales d&apos;Anthropic</a> et les <a href="https://openai.com/policies/business-terms/" target="_blank" rel="noopener noreferrer">conditions commerciales d&apos;OpenAI</a> (en anglais). Nous n&apos;entraînons aucun modèle d&apos;IA avec vos renseignements.
      </p>
      <p>Les résultats de l&apos;IA peuvent contenir des erreurs. Relisez toujours votre CV et votre lettre de présentation avant de les envoyer.</p>

      <h2>5. À qui nous les communiquons</h2>
      <p>Nous ne vendons ni ne louons de renseignements personnels, et nous ne les communiquons pas à des fins de publicité comportementale. Nous les communiquons uniquement aux fournisseurs de services qui font fonctionner {LEGAL.product}, chacun étant tenu par contrat de les protéger et de ne les utiliser que pour nous fournir son service :</p>
      <table className="legal-table">
        <thead><tr><th>Fournisseur</th><th>Rôle</th><th>Lieu</th></tr></thead>
        <tbody>
          <tr><td data-label="Fournisseur">Vercel</td><td data-label="Rôle">Héberge le site et l&apos;application, et compte les visites anonymes (Web Analytics)</td><td data-label="Lieu">États-Unis</td></tr>
          <tr><td data-label="Fournisseur">Neon</td><td data-label="Rôle">Stocke les données de votre compte (base de données)</td><td data-label="Lieu">États-Unis</td></tr>
          <tr><td data-label="Fournisseur">Clerk</td><td data-label="Rôle">Inscription, connexion et sécurité des comptes</td><td data-label="Lieu">États-Unis</td></tr>
          <tr><td data-label="Fournisseur">Anthropic</td><td data-label="Rôle">Analyse et rédaction par l&apos;IA (Claude)</td><td data-label="Lieu">États-Unis</td></tr>
          <tr><td data-label="Fournisseur">OpenAI</td><td data-label="Rôle">Analyse et rédaction par l&apos;IA, seulement si vous ajoutez une clé OpenAI</td><td data-label="Lieu">États-Unis</td></tr>
          <tr><td data-label="Fournisseur">Stripe</td><td data-label="Rôle">Paiements et abonnements du forfait Personnel (reçoit votre courriel, vos renseignements de paiement et votre adresse de facturation)</td><td data-label="Lieu">États-Unis</td></tr>
          <tr><td data-label="Fournisseur">Google Fonts</td><td data-label="Rôle">Polices du site (reçoit uniquement votre adresse IP)</td><td data-label="Lieu">États-Unis</td></tr>
        </tbody>
      </table>
      <p>
        <strong>Sources d&apos;offres.</strong> Pour trouver des emplois, nous consultons des sites d&apos;emploi publics (Greenhouse, Lever, Ashby, Recruitee) et, lorsque c&apos;est activé, nous effectuons des recherches sur Adzuna et Jooble. Ces recherches ne transmettent que des titres de poste et des noms de villes tirés de votre mandat, jamais votre nom, votre courriel ou votre CV. Lorsque vous collez un lien, notre serveur visite cette page pour la lire.
      </p>
      <p>
        Nous pouvons aussi communiquer des renseignements si la loi l&apos;exige, pour protéger la sécurité d&apos;une personne, ou dans le cadre d&apos;une vente ou d&apos;une réorganisation de {LEGAL.product}. En cas de vente, l&apos;acheteur devrait continuer de respecter la présente politique.
      </p>

      <h2>6. Hébergement à l&apos;extérieur du Québec et du Canada</h2>
      <p>
        Vos renseignements sont hébergés et traités aux États-Unis par les fournisseurs ci-dessus. Comme l&apos;exige la loi québécoise, avant de communiquer des renseignements personnels à l&apos;extérieur du Québec, nous évaluons s&apos;ils bénéficieront d&apos;une protection adéquate, en tenant compte des conditions contractuelles et des pratiques de sécurité de chaque fournisseur, et nous revoyons cette évaluation lorsque nos fournisseurs changent. Lorsqu&apos;ils se trouvent aux États-Unis, vos renseignements peuvent être accessibles aux autorités de ce pays en vertu des lois américaines.
      </p>

      <h2>7. Durée de conservation</h2>
      <p>
        Nous conservons vos renseignements tant que votre compte est ouvert. Lorsque vous supprimez votre compte, votre profil, votre CV, votre mandat, vos candidatures, vos documents, votre clé enregistrée, vos bilans, vos données d&apos;utilisation et votre journal d&apos;activité sont supprimés immédiatement. La suppression de votre compte annule aussi tout abonnement. Stripe conserve les dossiers de paiement et les factures aussi longtemps que l&apos;exigent les lois fiscales et comptables. Les copies de sauvegarde de notre fournisseur de base de données expirent selon leur cycle normal, en 30 jours ou moins. Nous conservons une trace de la suppression d&apos;un compte, sans aucun renseignement personnel. Les journaux de requêtes de nos fournisseurs d&apos;hébergement et de connexion expirent selon leurs propres calendriers.
      </p>

      <h2>8. Comment nous les protégeons</h2>
      <p>
        Toutes les communications passent par des connexions HTTPS chiffrées. Les clés IA enregistrées sont chiffrées avec une clé conservée séparément de la base de données. Seul le propriétaire du site peut voir les données des comptes, par un espace d&apos;administration protégé par connexion, et uniquement pour faire fonctionner le service et vous aider. Nous faisons appel à des fournisseurs reconnus qui ont leurs propres programmes de sécurité. Si un incident de confidentialité présente un risque de préjudice sérieux, nous vous en aviserons, ainsi que les autorités compétentes, comme l&apos;exige la loi : la Commission d&apos;accès à l&apos;information du Québec, le Commissariat à la protection de la vie privée du Canada et, s&apos;il y a lieu, les autorités des États américains.
      </p>

      <h2>9. Vos droits</h2>
      <p>Où que vous soyez, vous pouvez :</p>
      <ul>
        <li><strong>Consulter et télécharger</strong> vos renseignements : <em>Forfait → Télécharger mes données</em> vous remet un fichier structuré (JSON) contenant tout ce que nous conservons à votre sujet.</li>
        <li><strong>Les rectifier</strong> : modifiez votre CV et votre mandat en tout temps sous <em>Votre mandat</em>, ou demandez-le-nous.</li>
        <li><strong>Les supprimer</strong> : <em>Forfait → Supprimer mon compte</em> supprime immédiatement votre compte et vos données.</li>
        <li><strong>Retirer votre consentement</strong> à toute utilisation, par exemple en désactivant le pilote automatique, en retirant votre clé IA ou en supprimant votre compte.</li>
        <li><strong>Vous renseigner sur les recommandations automatisées</strong> : les renseignements et les facteurs qui les ont produites (voir la section 4).</li>
        <li><strong>Porter plainte</strong> : écrivez d&apos;abord à {mail}; nous vous répondrons dans les 30 jours. Vous pouvez aussi vous adresser à la <a href="https://www.cai.gouv.qc.ca/" target="_blank" rel="noopener noreferrer">Commission d&apos;accès à l&apos;information</a> du Québec, au <a href="https://www.priv.gc.ca/fr/" target="_blank" rel="noopener noreferrer">Commissariat à la protection de la vie privée du Canada</a> ou, aux États-Unis, au procureur général ou à l&apos;organisme de protection de la vie privée de votre État.</li>
      </ul>
      <p>
        <strong>Résidents des États-Unis.</strong> Selon votre État (par exemple la Californie, le Colorado, le Connecticut, la Virginie, le Texas ou l&apos;Oregon), vous pourriez avoir le droit de savoir ce que nous recueillons, d&apos;accéder à vos données, de les rectifier, de les supprimer et de les transférer, et de refuser la vente de données, la publicité ciblée et le profilage ayant des effets juridiques ou d&apos;importance similaire. Nous ne vendons pas de données, ne faisons pas de publicité ciblée et ne prenons pas de telles décisions à votre sujet. Résidents de la Californie : les catégories de renseignements recueillis et leurs sources figurent à la section 2, les finalités aux sections 2 et 4, et les destinataires à la section 5. Nous ne vous traiterons pas différemment parce que vous exercez vos droits. Vous pouvez recourir à un mandataire autorisé; nous pourrions vous demander de confirmer votre identité à partir du courriel de votre compte.
      </p>

      <h2>10. Âge</h2>
      <p>{LEGAL.product} s&apos;adresse aux personnes de {LEGAL.minimumAge} ans et plus. Nous ne recueillons pas sciemment de renseignements sur des personnes plus jeunes. Si vous croyez qu&apos;un enfant s&apos;est inscrit, écrivez à {mail} et nous supprimerons le compte.</p>

      <h2>11. Modifications</h2>
      <p>Si nous modifions la présente politique, nous mettrons à jour la date en haut de la page. Pour toute modification importante, nous vous en informerons dans l&apos;application ou par courriel avant son entrée en vigueur.</p>

      <h2>12. Nous joindre</h2>
      <p>{LEGAL.privacyOfficer}, responsable de la protection des renseignements personnels, {LEGAL.product}, Montréal (Québec), Canada. Courriel : {mail}.</p>
    </LegalPage>
  );
}
