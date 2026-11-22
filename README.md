# Kloss2

Statisk pallplanering med svenskt gränssnitt. Tre vyer: Veckokalender, Plastklossar och Produkter / Recept. Inga konton, serverberoenden eller externa resurser. Alla materialmängder anges i stycken.

## Starta

Kör `npm start` (Python 3 krävs) eller `python3 -m http.server 8000` i projektroten. Öppna port 8000 i din lokala webbläsare. Ingen installation eller byggprocess behövs. Relativa sökvägar fungerar i GitHub Pages under `/Kloss2/`.

Börja med plastklossar och saldon, lägg till produkter med recept och fyll i veckokalendern. Tomt fält betyder ingen plan; 0 är en sparad plan utan produktion. Produktordningen kan ändras med uppåtpilen i receptvyn.

## Beräkning

ISO-veckor och datum beräknas utan lokal sommartid. Dagens datum utgår från Europe/Stockholm. Hela pallar fördelas jämnt måndag–fredag; resten fördelas från måndag. Varje dag behandlas först saldo, sedan leveranser, sedan produkter i synlig ordning. Alla produkter delar samma klosslager. Dubbla receptposter summeras, och den begränsande komponenten avgör antalet hela pallar. Tillgängliga komponenter reserveras mot hela planbehovet, även när en annan komponent saknas. Ingen restorder flyttas till senare dagar. Senare leveranser ändrar aldrig tidigare brist.

Saldo gäller dagens början och ersätter föregående referenspunkt. Tidigare planer och leveranser dras inte av eller läggs till igen. För recept med olika saldodatum undantas dagar före det senaste datumet; uppdatera helst alla saldon samtidigt. Leveranser på saldodagen ska inte redan ingå i det inmatade saldot. Kalendern visar behov och täckning för den beräknade delen av veckan, och märker ut undantagna pallar. Stapel och antal bygger på samma resultat. Historiska planer ändrar inte saldot: detta är en prognos, inte bokföring av verkliga uttag.

## Data och säkerhetskopior

Data sparas automatiskt i localStorage för aktuell webbläsare och webbplats. JSON-export omfattar lager, produkter, recept, veckoplaner och leveranser. Import av Kloss2-format version 1 valideras och kräver bekräftelse innan ersättning. Äldre Kloss- och Spik-R-knare-format stöds inte. Exportera regelbundet. Skadat lokalt innehåll skrivs inte över automatiskt; importera en giltig kopia för att återställa. Ändringar av recept påverkar alla planer.

## Tester

`npm test` kör tolv testfall med Node.js 24, utan beroenden. De omfattar gemensamt lager, täckning, begränsande komponenter, receptsummering, ordning, leveranser, ISO-år, saldobyte, aktuell veckas resterande dagar, tomt/0 och JSON-validering.

`node tests/browser.cjs` kör webbläsartest med en separat installerad Playwright och Chromium (valfri sökväg via `CHROMIUM_PATH`). Starta först servern på port 8000. Vid installation utanför projektet kan `NODE_PATH` peka på dess node_modules. Testet använder en isolerad webbläsarprofil och kontrollerar formulär, kalenderändring, omladdning, export/import, ogiltig import och mobilens horisontella rullning med fast produktkolumn. Testfiler och skärmbild skrivs till `/tmp`.

## Publicering

`.github/workflows/pages.yml` testar och publicerar endast webbplatsens fyra filer vid push till `main`. I GitHub Settings → Pages ska GitHub Actions vara publiceringskälla. Automatisk aktivering via workflow kan kräva administratörsbehörighet; välj då källan i inställningarna och kör arbetsflödet igen. Avsedd adress: https://stldynamic.github.io/Kloss2/ .


## Märkningslager

Varje plastkloss har ett totalt saldo samt valfria underkategorier med namn och antal redan märkta klossar. Summan av märkta antal får inte överstiga totalsaldot. Samtliga gäller samma saldodatum. Ange antingen ett enskilt stämpelnamn eller en fullständig kombination; varje fysisk kloss hör till en enda kategori.

Exempel: totalt 90 klossar, varav 30 med V-EMB. Receptet innehåller 6 med V-EMB och 3 utan märkningskrav. Planen 10 pallar kräver 90 klossar, varav 60 märkta: 30 finns och 30 återstår att märka. Märkta klossar är inte extra material.

Märkningslager delas kronologiskt och enligt produktordningen. Kalendern visar behov, reserverade redan märkta antal, antal att märka och hela pallar med befintligt material och märkning. Prognosen bokför ingen stämpling. Uppdatera total- och märkningssaldo tillsammans efter inventering; datumet gäller båda. Leveranser betraktas som omärkta. Materialprognosen behåller sin tidigare betydelse och betraktar samtliga klossar av samma typ som material. Om andra märkta varianter måste reserveras för materialbehov tas dessa bort från senare märkningsprognoser i registrerad ordning. Kontrollera då praktiskt möjligheten att märka om dem. Att märka är totalt arbetsbehov och kan inkludera material som ännu saknas.

Äldre Kloss2-kopior utan märkningsfält fungerar oförändrat. JSON-export/import bevarar nya kategorier och receptkrav. En kategori som används i recept får inte tas bort eller byta namn utan att receptet först ändras. Ogiltiga formulär återställer föregående data.

Webbläsartestet verifierar också märkta saldon, recept, prognos och JSON-rundtur med märkningar. Alternativ testserver kan väljas med `TEST_URL`.
