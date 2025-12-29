export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          DeckTutor - MTG Deck Analysis & Combo Detection.
          <br className="sm:hidden" />
          <span className="text-xs">
            Card data provided by{' '}
            <a
              href="https://scryfall.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Scryfall
            </a>
            . Combo data from{' '}
            <a
              href="https://edhrec.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
            >
              EDHREC
            </a>
            .
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Not affiliated with Wizards of the Coast.
        </p>
      </div>
    </footer>
  );
}
