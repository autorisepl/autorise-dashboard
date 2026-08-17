import type { PipelineClientDetailed } from "@/app/api/notion/pipeline/route";

// Sekcja D (Faza 2): jeden stały, fikcyjny klient przypięty na górze listy w /kwalifikacja i
// /sprzedaz, żeby dało się przejść cały skrypt i brief bez potrzeby prawdziwego klienta.
// Numer telefonu jest celowo w formacie który nigdy nie jest realnym numerem (prefiks 000),
// żeby nikt przypadkiem nie zadzwonił — patrz TEST_CLIENT_ID / isTestClient niżej, ten sam
// obiekt jest wykrywany po ID w obu widokach i renderowany z odrębnym oznaczeniem wizualnym.
export const TEST_CLIENT_ID = "__demo_test_client__";

export const TEST_CLIENT: PipelineClientDetailed = {
  id: TEST_CLIENT_ID,
  firma: "Testowa Spedycja Demo Sp. z o.o.",
  kontakt: "Jan Testowy",
  telefon: "000 000 000",
  email: "demo@example.test",
  nip: "0000000000",
  status: "Nowy lead",
  lastModified: new Date().toISOString(),
  dataDiscovery: "",
  nastepnyKrok: "Kontakt testowy — nie dzwonić",
  ocenaICP: "TAK",
  dataFollowup: "",
  liczbaProb: 0,
  notatki: "Klient testowy do przechodzenia przez skrypt i brief bez realnego leada.",
  bolGlowny: "Spedytorzy ręcznie przepisują zlecenia z giełd transportowych do TMS, ok. 3h dziennie na osobę.",
  poprzednieProby: "Próbowali Power Automate, nie ogarnęło różnorodności formatów zleceń.",
  hipotezaBolGlowny:
    "Zespół spedycji traci kilkanaście godzin tygodniowo na ręczne przepisywanie zleceń i pilnowanie dokumentów, co ogranicza liczbę obsługiwanych tras.",
  uwagiFAgent2: "Klient zdemotywowany poprzednią próbą automatyzacji — podkreślić gwarancję zwrotu.",
  przewidywaneObiekcje:
    "Już próbowaliśmy programu który miał to robić i działa niedokładnie, więc pewnie u was będzie tak samo.\n" +
    "Mamy już wszystko zintegrowane (Timocom, Trans.eu, Webfleet), po co nam kolejny system.\n" +
    "To dodatkowy koszt, a my radzimy sobie zatrudniając dodatkowe osoby.",
  pitchRecipe:
    "Testowy przepis pitchu: pokaż ile godzin tygodniowo zespół traci dziś na ręczne przepisywanie zleceń, porównaj z czasem po wdrożeniu, zamknij gwarancją zwrotu.",
  ryzyka: "Brak realnych ryzyk — dane testowe.",
  godzinyWpisywania: 3,
  flota: 45,
  tms: "HMSoft",
  kosztRoczny: 180000,
  cytatyKlienta: "Nie mamy czasu ogarniać kolejnego systemu.|||W kontekście poprzedniej próby z Power Automate",
  warunkiDniDostepow: 0,
  warunkiUwagi: "",
  pozaZakresem: "",
  dataPierwszegoKontaktu: new Date().toISOString().slice(0, 10),
  utracony: false,
  powodUtraty: "",
  systemTransformacji: [],
  zdanieRoznicujace: "",
  roiDopowiedzenie: "",
  retainer: 0,
  dataPotwierdzeniaDostepow: "",
  czasBazowyPotwierdzony: 0,
  dostepyZebrane: "",
  ostatniKontaktRetainer: "",
  historiaZgloszenRetainer: "",
  wynikDiscovery: "",
  protokolOdbioruPodpisany: false,
  dataProtokoluOdbioru: "",
  kickoffOdbyty: false,
  dataKickoff: "",
  uwagiAgenta1: "",
  moduleWdrazane: [],
  tabelaModulowKickoff: "",
  tabelaModulowWeryfikacja: "",
  celEfektywnosciProcent: 0,
  tabelaModulowPrzedkontraktowa: "",
};

export function isTestClient(client: Pick<PipelineClientDetailed, "id"> | null | undefined): boolean {
  return client?.id === TEST_CLIENT_ID;
}
