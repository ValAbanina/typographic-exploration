/*
  Project 01: Typographic Exploration — showcase data
  -----------------------------------------------------
  One entry per cover, in the order they appear on the site.
  To reorder, move entries up or down. To add one, copy an entry,
  put the images in /covers as <slug>-1600.webp and <slug>-640.webp,
  and fill in the song IDs:

  sp   = Spotify track ID: the 22 characters after /track/ in the song's
         Spotify link (Share → Copy Song Link). This is what plays.
  yt   = YouTube video ID: the 11 characters after watch?v=. Used for the
         "Full song on YouTube" link.
  tint = the cover's average colour, used for the soft glow behind the
         listening view and the record's sheen in the intro.
  wave = the shape of the sound line the record draws in the intro:
         calm, swell, bouncy, groove, heavy, pulse, march, sparkle,
         jagged, frantic or horror.
*/
window.COVERS = [
  { slug: "same-stars",           song: "Same Stars",              artist: "Alex Warren",          student: "Valentina Barrera Arguello", sp: "06sZjwAy4DTJfpOuel7nv4", yt: "Nwoczde0BrA", tint: "#3b3e3c", wave: "swell" },
  { slug: "espresso",             song: "Espresso",                artist: "Sabrina Carpenter",    student: "Hyeju Kim",                  sp: "2HRqTpkrJO5ggZyyK6NPWz", yt: "eVli-tstM5E", tint: "#e7bb83", wave: "bouncy" },
  { slug: "empress-rising",       song: "Empress Rising",          artist: "Monolord",             student: "Eric Paulson",               sp: "21pZBpd9XgAmJQFnBeLIKV", yt: "XIxXP8_BgZg", tint: "#142c27", wave: "heavy" },
  { slug: "la-vuelta-al-mundo",   song: "La Vuelta al Mundo",      artist: "Calle 13",             student: "Ariana Lavalle Morocho",     sp: "1jlKdNbOA90rjnt88GJnwO", yt: "v_zZmsFZDaM", tint: "#dfd8c7", wave: "groove" },
  { slug: "stupid-brain",         song: "Stupid Brain",            artist: "P1Harmony",            student: "Fay He",                     sp: "2IkRaB1f2WfjDfd2Un337i", yt: "4XMJIQ064dM", tint: "#33456e", wave: "pulse" },
  { slug: "heavensward",          song: "Heavensward",             artist: "Final Fantasy XIV",    student: "Abdullahi Osman",            sp: "4YsrOSomyvkRQvFwE5j8Lw", yt: "Wl43jXjn2Ys", tint: "#e2e8ef", wave: "swell" },
  { slug: "the-unsung-war",       song: "The Unsung War",          artist: "Keiki Kobayashi",      student: "Jack Zhou",                  sp: "141TAZJW27CJuYAwyEOICK", yt: "hQFI3rWfuEI", tint: "#392424", wave: "march" },
  { slug: "wildflower",           song: "Wildflower",              artist: "Billie Eilish",        student: "Ellie Kim",                  sp: "3QaPy1KgI7nu9FJEQUgn6h", yt: "l08Zw-RY__Q", tint: "#84614a", wave: "calm" },
  { slug: "star-trace",           song: "Star Trace",              artist: "PLAVE",                student: "Micah Canlas",               sp: "1uH8RqO7kx4je1VS91Oe02", yt: "TBmE7m0yEwY", tint: "#8a184c", wave: "sparkle" },
  { slug: "lost",                 song: "LOST!",                   artist: "RM",                   student: "Helen Dang",                 sp: "02H58MSfVESkKyx4diDgu7", yt: "kq6UVL3H6SI", tint: "#ad9167", wave: "bouncy" },
  { slug: "raat-ki-rani",         song: "Raat Ki Rani",            artist: "Arooj Aftab",          student: "Charity Zapanta",            sp: "5bYvn1VEE4f4kjug81vwmE", yt: "Zhbr05Zysiw", tint: "#151516", wave: "calm" },
  { slug: "nhat-bai-thien-dia",   song: "Nhất Bái Thiên Địa",      artist: "The Flob",             student: "Doris Nguyen",               sp: "6wXzgpL1wKK603fLtXLelr", yt: "Mhv4DuhXr6w", tint: "#5d412d", wave: "jagged" },
  { slug: "atychiphobia",         song: "Atychiphobia",            artist: "Boggio",               student: "Elizabeth Baker",            sp: "2TgJ6DuPeO3sIMH2bGMcuA", yt: "KWBsYpJJP6E", tint: "#39021f", wave: "frantic" },
  { slug: "scream-for-halloween", song: "Scream! (For Halloween)", artist: "LVCRFT x The Remains", student: "Megan Wolak",                sp: "7g5KkkO72jkhudvrvW39yW", yt: "OQBSxLBzOwA", tint: "#542403", wave: "horror" }
];
