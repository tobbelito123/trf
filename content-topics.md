# vembudar.se innehållsbacklogg

Kö med ämnen för den automatiska innehållsgeneratorn. Ta det översta objektet med status
`pending`, skriv sidan, flika sedan om det till `published` (med datum) i samma commit.

**Självväxande kö:** om färre än 5 `pending`-poster finns kvar i kön efter en körning, lägg
till 5-8 nya ämnen i samma format innan körningen avslutas — riktiga, praktiska vinklar på hur
man som leverantör vinner offentliga upphandlingar (inte en omskrivning av en befintlig sida).
Kolla `llms.txt` och `sitemap.xml` först så nya ämnen inte överlappar. Detta håller kön igång
utan att en människa behöver fylla på den.

**Vinkel, ALLA nya sidor:** leverantörens/anbudsgivarens perspektiv — konkreta, praktiska råd
för att faktiskt VINNA upphandlingar (skriva bättre anbud, undvika diskvalificering, prissätta
rätt, hitta rätt upphandlingar att svara på). Inte ännu en allmän förklaring av vad offentlig
upphandling är, det täcks redan av `/kunskap.html` och `/ordlista.html`.

## Kö

1. slug: `skriva-kvalitetsdel-anbud` — status: pending
   Arbetstitel: "Så Skriver Du Kvalitetsdelen i Ditt Anbud (Som Faktiskt Ger Poäng)"
   Vinkel: konkret hur man strukturerar och formulerar den beskrivande kvalitetsdelen så den
   är lätt att poängsätta för en upphandlare som läser hundratals anbud, inte bara "skriv bra".

2. slug: `vanliga-misstag-som-diskvalificerar-anbud` — status: pending
   Arbetstitel: "Misstagen Som Diskvalificerar Annars Bra Anbud"
   Vinkel: formaliafel (missad signatur, fel format, sen inlämning), missade skallkrav, och
   varför "nästan rätt" ofta räcker för att åka ut helt i offentlig upphandling.

3. slug: `hur-prissatta-anbud-ratt` — status: pending
   Arbetstitel: "Hur Du Prissätter Ett Anbud Utan Att Underbjuda Dig Själv"
   Vinkel: balansen mellan konkurrenskraftigt pris och lönsamhet, och hur utvärderingsmodellen
   (lägsta pris vs bästa förhållande pris/kvalitet) borde styra prisstrategin.

4. slug: `sma-foretag-vinna-upphandlingar` — status: pending
   Arbetstitel: "Så Konkurrerar Mindre Företag Om Offentliga Kontrakt"
   Vinkel: praktiska sätt mindre leverantörer faktiskt vinner mot stora aktörer (nischkompetens,
   lokal närvaro, mindre kontraktsvärden, anbudssamverkan).

5. slug: `referenser-i-anbud` — status: pending
   Arbetstitel: "Hur Du Väljer och Beskriver Referensuppdrag i Ett Anbud"
   Vinkel: vilka referenser som faktiskt stärker ett anbud, och hur man beskriver dem konkret
   istället för generiskt.

6. slug: `overprovning-nar-du-forlorar` — status: pending
   Arbetstitel: "Du Förlorade Upphandlingen. Är Det Värt Att Begära Överprövning?"
   Vinkel: allmän, praktisk framing av vad överprövning innebär och när det är rimligt att
   överväga. INGA specifika tidsfrister, paragrafnummer eller belopp ska anges (dessa ändras
   och varierar) — hänvisa istället till att kontrollera exakta regler hos Upphandlingsmyndigheten
   eller en jurist för det specifika fallet.

7. slug: `anbudssamverkan-konsortium` — status: pending
   Arbetstitel: "Anbudssamverkan: Att Gå Ihop Med Andra Företag Om Ett Anbud"
   Vinkel: hur och varför mindre leverantörer samarbetar för att klara kvalificeringskrav de
   inte når själva, generellt hållet.

8. slug: `checklista-infor-anbudsinlamning` — status: pending
   Arbetstitel: "Checklistan Innan Du Skickar In Anbudet"
   Vinkel: en konkret, praktisk sista-koll-lista (skallkrav, bilagor, signaturer, format,
   tidsstämpel) innan inlämning.

9. slug: `hur-lasa-forfragningsunderlag-ratt` — status: pending
   Arbetstitel: "Så Läser Du Ett Förfrågningsunderlag Utan Att Missa Något"
   Vinkel: metodisk genomläsning (kravspecifikation, kvalificeringskrav, tilldelningskriterier,
   administrativa krav var för sig) istället för att läsa hela dokumentet linjärt en gång.

10. slug: `espd-vad-ar-det` — status: pending
    Arbetstitel: "ESPD: Vad Det Är och Varför Det Dyker Upp i Nästan Alla Upphandlingar"
    Vinkel: praktisk förklaring av det europeiska enhetliga upphandlingsdokumentet och vad en
    leverantör faktiskt behöver fylla i, utan att ange föråldrade formulärversioner eller detaljer
    som kan ändras.

11. slug: `tidsplanering-anbudsskrivande` — status: pending
    Arbetstitel: "Så Planerar Du Tiden När Du Skriver Anbud"
    Vinkel: praktisk tidsplanering bakåt från sista svarsdag, varför sista-minuten-anbud oftare
    innehåller fel som diskvalificerar.

12. slug: `skillnad-skall-krav-borkrav` — status: pending
    Arbetstitel: "Ska-krav vs Bör-krav: Var Vinns Faktiskt Poängen"
    Vinkel: skillnaden mellan obligatoriska krav (allt-eller-inget) och mervärdeskriterier som
    faktiskt särskiljer anbud i utvärderingen.

13. slug: `hitta-ratt-upphandlingar-att-svara-pa` — status: pending
    Arbetstitel: "Hur Du Hittar Upphandlingar Värda Att Svara På (Inte Bara Alla)"
    Vinkel: ties till appens egna filter (ort, CPV-kod, fritext) — varför det lönar sig att
    vara selektiv och fokusera resurser på upphandlingar man faktiskt har goda odds i.

14. slug: `anbud-forsta-gangen-nyborjarguide` — status: pending
    Arbetstitel: "Ditt Första Anbud: En Nybörjarguide"
    Vinkel: praktisk startguide för ett företag som aldrig lämnat anbud förut, vad man
    realistiskt bör förvänta sig av processen och tidsåtgången.

15. slug: `prissattningsstrategier-lagsta-pris-vs-bfpk` — status: pending
    Arbetstitel: "Prissättningsstrategi: Lägsta Pris vs Bästa Förhållande Pris/Kvalitet"
    Vinkel: hur prisstrategin bör skilja sig radikalt beroende på vilken utvärderingsmodell
    upphandlingen använder.

16. slug: `efter-tilldelning-vad-hander-sen` — status: pending
    Arbetstitel: "Du Vann Upphandlingen. Vad Händer Nu?"
    Vinkel: praktiskt vad som sker mellan tilldelningsbeslut och kontraktstecknande (avtalsspärr,
    eventuell överprövning från konkurrenter, förberedelser inför avtalsstart), generellt hållet
    utan specifika tidsfrister som kan ändras.

## Redan publicerat (duplicera inte)
- `kunskap` — komplett guide till offentlig upphandling och LOU
- `ordlista` — ordlista över centrala begrepp
- `cpv-koder` — fördjupning om CPV-koder
- `direktupphandling` — fördjupning om direktupphandling och gränsvärden
- `ramavtal` — fördjupning om ramavtal och avrop
- `jamfor-upphandlingstjanster` — jämförelse mot Mercell/Opic, e-Avrop/Pabliq, Kommers Annons
- `faq` — vanliga frågor
- `studieteknik-lou` — studieteknik för att lära sig LOU
- `prov-offentlig-upphandling` — övningsprov/quiz
