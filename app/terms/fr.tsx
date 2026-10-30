import Link from "next/link";
import LegalPage, { ContactEmail } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

const mail = <ContactEmail />;

/** Conditions d'utilisation, version française (Québec). Même contenu que la version anglaise. */
export function TermsFr() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      summary={
        <ul>
          <li>{LEGAL.product} vous aide à trouver des emplois et à préparer vos candidatures. C&apos;est vous qui décidez quoi envoyer, et vous l&apos;envoyez vous-même.</li>
          <li>La rédaction par l&apos;IA peut contenir des erreurs. Relisez tout avant de l&apos;utiliser et assurez-vous que c&apos;est exact.</li>
          <li>Votre CV et vos documents vous appartiennent. Utilisez le service de façon loyale : pas de candidatures en masse, pas d&apos;extraction de données, pas de données d&apos;autrui.</li>
          <li>Nous ne pouvons pas promettre d&apos;entrevues ni d&apos;emplois. Si vous habitez au Québec ou ailleurs où des lois protègent les consommateurs, vous conservez tous les droits que ces lois vous accordent.</li>
        </ul>
      }
    >
      <h2>1. Les présentes conditions</h2>
      <p>
        Les présentes conditions d&apos;utilisation constituent une entente entre vous et {LEGAL.operator}, qui exploite {LEGAL.product} (« nous »). En créant un compte ou en utilisant {LEGAL.product}, vous les acceptez, ainsi que notre <Link href="/privacy">politique de confidentialité</Link>. Si vous ne les acceptez pas, veuillez ne pas utiliser le service.
      </p>
      <p>
        Vous devez avoir au moins {LEGAL.minimumAge} ans. Si vous n&apos;avez pas atteint l&apos;âge de la majorité là où vous habitez, vous devez obtenir la permission d&apos;un parent ou d&apos;un tuteur. Vous devez fournir des renseignements exacts à l&apos;inscription et protéger vos informations de connexion. Vous êtes responsable de ce qui se passe dans votre compte.
      </p>
      <p>
        Les présentes conditions sont offertes en français et en anglais. Au Québec, la version française vous est présentée d&apos;abord; vous pouvez consulter la version anglaise avec le sélecteur de langue.
      </p>

      <h2>2. Ce que fait {LEGAL.product}, et ce qu&apos;il ne fait pas</h2>
      <p>
        {LEGAL.product} est un outil pour les chercheurs d&apos;emploi. Il lit des offres d&apos;emploi publiques, leur attribue un score et les recommande selon votre mandat et votre CV, fait le suivi de vos candidatures, vous rappelle de relancer et utilise l&apos;IA pour rédiger des CV et des lettres de présentation adaptés.
      </p>
      <ul>
        <li>Nous ne sommes <strong>ni un employeur, ni un recruteur, ni une agence de placement ou de location de personnel</strong>. Nous ne vous représentons pas auprès des employeurs et ne sommes pas payés par eux.</li>
        <li>Nous <strong>ne soumettons jamais de candidatures</strong> et ne communiquons jamais avec des employeurs à votre place, y compris avec le pilote automatique. Vous choisissez ce que vous envoyez, et vous l&apos;envoyez vous-même.</li>
        <li>Nous <strong>ne garantissons pas</strong> d&apos;entrevues ni d&apos;offres, ni qu&apos;une offre d&apos;emploi est exacte, toujours ouverte ou légitime.</li>
        <li>Nos recommandations et nos documents <strong>ne constituent pas des conseils d&apos;orientation, juridiques, d&apos;immigration ou financiers</strong>.</li>
      </ul>

      <h2>3. Contenu produit par l&apos;IA</h2>
      <p>
        {LEGAL.product} utilise des modèles d&apos;IA d&apos;Anthropic et d&apos;OpenAI. Nous leur demandons de n&apos;utiliser que les faits de votre CV et d&apos;indiquer les lacunes au lieu d&apos;inventer de l&apos;expérience, mais l&apos;IA peut quand même se tromper. Elle peut mal lire votre CV, mal évaluer une offre ou formuler quelque chose de façon inexacte. Vous vous engagez à :
      </p>
      <ul>
        <li>relire et corriger chaque CV et chaque lettre de présentation avant de les utiliser;</li>
        <li>n&apos;envoyer que des renseignements véridiques à votre sujet;</li>
        <li>respecter les règles qu&apos;un employeur fixe quant à l&apos;utilisation de l&apos;IA dans les candidatures.</li>
      </ul>
      <p>Vous êtes responsable des candidatures que vous envoyez.</p>

      <h2>4. Pilote automatique</h2>
      <p>
        Le pilote automatique est désactivé, sauf si vous l&apos;activez. Lorsqu&apos;il est activé, {LEGAL.product} approuve les postes que l&apos;IA recommande à partir du score que vous choisissez, jusqu&apos;à votre limite quotidienne, et en rédige le CV et la lettre de présentation. Il agit selon vos instructions, et vous pouvez le désactiver en tout temps. Il ne soumet jamais rien. Chaque approbation compte dans les limites de votre forfait et, avec votre propre clé IA, votre fournisseur vous facture la rédaction.
      </p>

      <h2>5. Forfaits, votre propre clé IA et limites</h2>
      <ul>
        <li><strong>Semaine gratuite.</strong> Les nouveaux comptes bénéficient de 7 jours avec l&apos;IA à nos frais, incluant jusqu&apos;à 5 candidatures adaptées et des limites de demandes quotidiennes. Ces limites peuvent changer.</li>
        <li><strong>Votre propre clé.</strong> Si vous ajoutez votre propre clé d&apos;API Anthropic ou OpenAI, {LEGAL.product} est gratuit pour vous, et votre fournisseur vous facture directement l&apos;IA que vous utilisez. Vous êtes responsable de ces frais et du respect des conditions de votre fournisseur. Nous vous recommandons de fixer une limite de dépenses auprès de lui. Vous pouvez retirer votre clé en tout temps.</li>
        <li>
          <strong>Forfait Personnel.</strong> Offert au Canada et aux États-Unis seulement, pour l&apos;instant. Un abonnement mensuel au prix affiché avant le paiement : en dollars canadiens au Canada et en dollars américains aux États-Unis, selon l&apos;endroit où vous vous trouvez au moment de l&apos;abonnement. Les taxes sont incluses dans ce prix. Il comprend le nombre de candidatures adaptées et de demandes IA quotidiennes indiqué sur votre page Forfait. Les quotas inutilisés ne sont pas reportés.
        </li>
        <li>
          <strong>Facturation et renouvellement.</strong> Les paiements sont traités par Stripe. Nous ne voyons ni ne conservons jamais votre numéro de carte complet. Votre abonnement se renouvelle automatiquement chaque mois à la date de votre inscription, jusqu&apos;à ce que vous l&apos;annuliez. Si un paiement échoue, Stripe le tente de nouveau pendant une courte période, et votre forfait peut prendre fin s&apos;il ne peut être perçu.
        </li>
        <li>
          <strong>Annulation.</strong> Vous pouvez annuler en tout temps sous <em>Forfait → Gérer la facturation</em>. L&apos;annulation empêche le prochain renouvellement, et vous conservez le forfait Personnel jusqu&apos;à la fin du mois payé. Nous ne remboursons pas partiellement le reste d&apos;un mois, sauf si la loi l&apos;exige. En cas de problème, communiquez avec nous et nous l&apos;examinerons.
        </li>
        <li>
          <strong>Pause.</strong> Vous pouvez mettre votre forfait en pause sous <em>Forfait</em> pour 1 à 3 mois, ou jusqu&apos;à ce que vous repreniez. Vous pouvez aussi nous indiquer que vous avez décroché un emploi, ce qui met tout en pause immédiatement. Pendant la pause, rien ne vous est facturé, et vous conservez le forfait Personnel jusqu&apos;à la fin du mois payé. Si vous fixez une date de fin, la facturation reprend d&apos;elle-même à cette date, sauf si vous annulez avant. Si vous reprenez après la fin du mois payé, un nouveau mois commence ce jour-là et vous est facturé à ce moment.
        </li>
        <li>
          <strong>Changements de prix.</strong> Nous vous aviserons au moins 30 jours avant qu&apos;un changement de prix s&apos;applique à votre abonnement, et vous pourrez annuler avant qu&apos;il ne prenne effet.
        </li>
      </ul>
      <p>Nous pouvons modifier ou cesser des fonctionnalités gratuites, avec un avis dans l&apos;application lorsque c&apos;est possible.</p>

      <h2>6. Votre contenu</h2>
      <p>
        Votre CV, votre mandat, vos notes et les documents produits pour vous vous appartiennent. Vous nous autorisez à les conserver, à les traiter et à les transmettre à nos fournisseurs de services (voir la <Link href="/privacy">politique de confidentialité</Link>) uniquement dans la mesure nécessaire pour faire fonctionner {LEGAL.product} pour vous. Cette autorisation prend fin lorsque vous les supprimez ou supprimez votre compte. Vous confirmez avoir le droit de téléverser ce que vous téléversez. Ne téléversez pas le CV ou les renseignements personnels d&apos;une autre personne sans sa permission.
      </p>

      <h2>7. Offres d&apos;emploi et autres sites</h2>
      <p>
        Les offres d&apos;emploi proviennent de tiers : les sites d&apos;emploi des entreprises elles-mêmes, des sites de recherche d&apos;emploi comme Adzuna et Jooble, et les liens que vous ajoutez. Elles appartiennent à leurs propriétaires. Nous ne les vérifions pas et ne sommes pas responsables de leur contenu, ni des sites auxquels elles mènent. Méfiez-vous des fraudes : un véritable employeur ne vous demandera pas de payer pour postuler, ni vos coordonnées bancaires avant une offre.
      </p>

      <h2>8. Utilisation loyale</h2>
      <p>Vous vous engagez à ne pas :</p>
      <ul>
        <li>utiliser {LEGAL.product} pour envoyer des pourriels ou des candidatures en masse non ciblées, ni pour usurper l&apos;identité de quiconque;</li>
        <li>extraire, copier ou revendre les données d&apos;offres d&apos;emploi ou d&apos;autres contenus de {LEGAL.product};</li>
        <li>contourner les limites d&apos;utilisation, par exemple au moyen de plusieurs comptes gratuits, ni nuire au service ou à sa sécurité;</li>
        <li>faire de l&apos;ingénierie inverse du service ou l&apos;utiliser pour créer un produit concurrent;</li>
        <li>téléverser un logiciel malveillant ou du contenu illégal, discriminatoire ou qui porte atteinte aux droits d&apos;autrui;</li>
        <li>l&apos;utiliser d&apos;une manière qui contrevient à la loi, aux politiques d&apos;utilisation de votre fournisseur d&apos;IA ou aux conditions d&apos;un site d&apos;emploi.</li>
      </ul>

      <h2>9. Fermeture de votre compte</h2>
      <p>
        Vous pouvez supprimer votre compte en tout temps sous <em>Forfait → Supprimer mon compte</em>. Nous pouvons suspendre ou fermer les comptes qui contreviennent aux présentes conditions ou qui mettent le service ou d&apos;autres personnes à risque. Lorsque c&apos;est raisonnable, nous vous en expliquerons d&apos;abord la raison. Nous pouvons aussi cesser d&apos;offrir {LEGAL.product}; le cas échéant, nous vous donnerons, dans la mesure du possible, un préavis d&apos;au moins 30 jours pour télécharger vos données.
      </p>

      <h2>10. Exclusions et responsabilité</h2>
      <p>
        Nous faisons tout pour que {LEGAL.product} soit utile et disponible, mais il est fourni « tel quel » et « selon sa disponibilité ». Dans la mesure permise par la loi, nous n&apos;offrons aucune garantie autre que celles des présentes conditions, et nous ne sommes pas responsables des pertes indirectes, comme des occasions manquées, une perte de revenus ou une perte de données. Notre responsabilité totale pour toute réclamation est limitée au plus élevé des montants suivants : ce que vous nous avez payé au cours des 12 mois précédant la réclamation, ou 100 $ CA.
      </p>
      <p>
        <strong>Rien dans les présentes conditions ne limite les droits que vous confèrent les lois de protection du consommateur auxquels on ne peut renoncer.</strong> Cela comprend la <em>Loi sur la protection du consommateur</em> du Québec et le <em>Code civil du Québec</em>, qui ne nous permettent pas d&apos;exclure notre responsabilité pour notre propre faute ni certaines garanties. Si vous habitez au Québec ou ailleurs où de telles lois s&apos;appliquent, les limites ci-dessus ne s&apos;appliquent que dans la mesure où ces lois le permettent.
      </p>

      <h2>11. Droit applicable et différends</h2>
      <p>
        Les présentes conditions sont régies par les lois du Québec et les lois fédérales du Canada qui s&apos;y appliquent. Les différends relèvent des tribunaux du district judiciaire de Montréal. Si vous êtes un consommateur, vous pouvez aussi intenter un recours devant les tribunaux de votre lieu de résidence, et les lois impératives de protection du consommateur de votre province ou de votre État continuent de s&apos;appliquer. Aucun arbitrage n&apos;est obligatoire, et rien ici ne vous empêche de participer à une action collective. Veuillez d&apos;abord communiquer avec nous à {mail}. La plupart des problèmes se règlent rapidement.
      </p>

      <h2>12. Modifications des présentes conditions</h2>
      <p>
        Nous pouvons mettre à jour les présentes conditions. Pour toute modification importante, nous vous aviserons dans l&apos;application ou par courriel au moins 30 jours avant son entrée en vigueur. L&apos;avis présentera la nouvelle version, ce qui change et comment refuser la modification en fermant votre compte. Continuer d&apos;utiliser {LEGAL.product} après cette date signifie que vous l&apos;acceptez.
      </p>

      <h2>13. Nous joindre</h2>
      <p>{LEGAL.operator}, {LEGAL.product}, Montréal (Québec), Canada. Courriel : {mail}.</p>
    </LegalPage>
  );
}
