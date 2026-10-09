const contactEmail = "contact@nuzlocke.gg"

/**
 * The rights line with the contact email for rights holders. Shown on the
 * sign-in page and in Settings.
 */
export function RightsLine() {
  return (
    <div className="text-sm text-muted-foreground">
      <p>
        Pokémon and the sprites are © Nintendo, Creatures Inc., and GAME FREAK
        inc. nuzlocke.gg is a fan project and is not affiliated with them.
      </p>
      <p>
        Rights holders can write to{" "}
        <a
          href={`mailto:${contactEmail}`}
          className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-foreground"
        >
          {contactEmail}
        </a>
        .
      </p>
    </div>
  )
}
