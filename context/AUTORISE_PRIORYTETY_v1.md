# Autorise, priorytety i zasady pracy (v2, aktualizacja po sesji 2026-07-11/12)

Ten plik jest jedynym źródłem prawdy o priorytetach. Zastępuje rozproszone pomysły z promptów.
Aktualizowany na końcu każdej sesji. Podpięty w CLAUDE.md.

## Zrobione i zweryfikowane w tej sesji

Migracja Notion (Cytaty klienta, Pitch Recipe + 41 innych pól) — potwierdzona niezależnym odczytem schematu, naprawiona po znalezieniu że oryginalny kod używał złej metody SDK (databases.update zamiast dataSources.update dla bazy z wieloma data source'ami).

Reset-lead endpoint (/api/notion/reset-lead) — czyści kartę jednocześnie w Notion Pipeline i Google Sheets jednym przyciskiem, z zabezpieczeniem blokującym reset klientów w statusach Kickoff/Wdrożenie/Retainer/Upsell/Zakończona współpraca.

Naprawiony flash panelu admina przy logowaniu jako setter.

Ujednolicony format telefonu (+48 XXX XXX XXX) przy każdym zapisie do Notion, plus jednorazowy backfill istniejących kart.

Posprzątany schemat Notion: usunięte 4 martwe, zdublowane pola (Wynik Discovery 1, Followup typ, Followup data, Data follow-up), powstałe przez błąd kodowania w starej migracji. Jedno piąte (mojibake "Liczba pr█b kontaktu") skasowane ręcznie przez Michała.

Pierwszy udany live test Agenta 1 na realnym transkrypcie (Arek Burkowski): liczby sensowne (39 375 PLN/mc, 472 500 PLN/rok), ICP poprawnie ocenione, agent sam złapał rozbieżność między tym co sprzedawca powiedział głosem klientowi (55 tys.) a poprawnym przeliczeniem (39 375 PLN) — do skorygowania na Discovery.

Naprawiony bug języka Claude Code: CLAUDE.md nie miał żadnej reguły języka/tonu (nie awaria harnessu, brak treści). Dodana reguła na górze pliku.

Zakładka /statystyki: automatyczne metryki z Notion Pipeline (nowe leady, discovery, show rate, sprzedaże) + ręczne liczniki dzienne (Dials, Rozmowy, SMS) w osobnej bazie Notion, zweryfikowane działające.

Przegląd ekosystemu skilli Claude Code: 238 → docelowo kilkanaście. Zostają: frontend-design, taste-skill (design-taste-frontend), security-review, security-scan. Usunięty cały gsd-* (konkurencyjny system zarządzania projektem, duplikujący ten plik), cały duplikat designerski (impeccable, redesign-skill, brand, design, slides, ui-styling, ui-ux-pro-max), 8 skilli logistycznych dobrej jakości ale złego kontekstu (carrier-relationship-management, customs-trade-compliance, inventory-demand-planning, logistics-exception-management, returns-reverse-logistics, production-scheduling, quality-nonconformance, energy-procurement) — możliwe przyszłe zastosowanie w promptach Agenta 2/3, do rozważenia osobno.

Posprzątany root workspace'u: usunięty martwy, sprzeczny katalog context/ w głównym folderze (osobny od żywego autorise-dashboard/context/), usunięta osierocona strona /narzedzia/kalkulator, zainicjowany git w autorise-mcp-server.

## Priorytet 4, w tle, bez pilności (aktualny)

Pełny redesign prezentacji skillem taste-skill. Rozbudowa mapy procesów sprzedażowych (/mapa).

## Zasada oceny narzędzi (bez zmian)

Narzędzie zostaje tylko jeśli: pasuje do realnego stacku (Next.js, TypeScript, Notion, Google, Vercel), wiadomo dokładnie kiedy się odpala, zastępuje pracę robioną w kółko, oszczędza więcej niż kosztuje kontekstu. Jeśli nie umiesz nazwać kiedy się odpala, to jest śmieć, domyślnie kasuj.

## Rytm aktualizacji

Koniec każdej sesji: dopisz wiersz do AUTORISE_SESSION_LOG.md. Zmiana priorytetów: aktualizuj ten plik, nie twórz nowego. Nowe narzędzie kusi: przepuść przez zasadę oceny wyżej zanim zainstalujesz.
