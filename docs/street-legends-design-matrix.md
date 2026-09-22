# Street Legends — Design Matrix

*Small objects. Impossible plays. Big moments.*

Street Legends is a separate mode layered on the six **real** campaign venues.
Classic Campaign and the 2-Player Table are unchanged. Every Street Legends
venue keeps its name, place, rival, team and palette from
`src/levels/campaign-level-definitions.js`. It adds one signature mechanic,
one objective and one hero moment, taught through a three-act structure.

Status: **Roadside Showdown and Harmattan Haze are built and playable.** The other four are designed, not built.
Street Legends lists every built venue's acts; each venue's Act 1 is always open.

## Design rules for every venue
- Architecture first, then material, then detail. No universal props. Animals only where they belong: guinea fowl at Tamale, nowhere else.
- A mechanic changes **between turns** or follows a visible, fixed rhythm. Nothing moves during a flick. Every change is signalled at least one turn ahead.
- The AI rehearses on the same physics. The mechanic adds only foresight (what changes next turn) and a rival's tactical weights. It gets no hidden advantages.
- Hero moments are reserved for shots that use the mechanic. Ordinary contacts keep ordinary feedback, scaled by contact strength.

## The six venues

| | 1 Schoolyard Break | 2 Kiosk Corner | 3 Veranda Derby | 4 Roadside Showdown ✅ | 5 Harmattan Haze ✅ | 6 Lights Out Final |
|---|---|---|---|---|---|---|
| **Place** | Adabraka Primary, Accra | Nima Market Road | Auntie Ama's Veranda, Kumasi | Tema Motorway Junction | Tamale Lorry Station | Jamestown, under the kiosk bulb |
| **Rival** | Kwame (rookie) | Esi (easy) | Yaw (medium) | Akosua (medium → hard) | Abdul (hard) | Kofi "Magic" (champion) |
| **Pitch construction** | Two classroom desks pushed together; a raised seam down the middle | Kiosk serving counter with a hinged hatch lid along one flank | Low board on the polished red-oxide veranda floor, kneeling height | Painted planks on trestles at the toll plaza kerb | Tailboard of a parked lorry, planks and bolts | Dark carved desk under a single bulb |
| **Architectural silhouette** | Louvred single-storey classroom block, veranda pillars | Container kiosk, awning, stacked crates | Colonial-era Kumasi house, balustrade, louvre shutters | Toll canopy gantry, booths, chop bar across the gutter | Lorry cabs and the station signboard in haze | Kiosk hatch, lighthouse beam on the horizon |
| **Surface / palette** | Scarred desk wood, chalk dust, blue ink stains | Laminate, sachet rings, market oranges and greens | Red oxide, raffia, Kente accents, clay pots | Asphalt grey, kerb yellow/black, boom red/white | Dust-bleached orange, sacking, faded paint | Near-black wood, tungsten amber, sea blue |
| **Goals / boundaries** | Pencil-case goals, ruler rails | Crate-slat goals, counter lip rails | Clay-pot goalposts, veranda step edge | Steel goals, kerb islands, three-lane toll plazas | Tailboard bolts, rope goal nets | Carved goals, coin-stack posts |
| **Environmental story** | Break time, and Kwame bet his toffee before the bell | Esi plays between customers while the hatch opens and shuts | Auntie Ama's pots are off-limits, but Yaw banks off them | Rush hour: the booms decide who gets through | The lorry is loading; catch it before it leaves | Magic has never lost under this bulb |
| **Light / atmosphere** | Hard midday, sharp veranda shade | Late-afternoon side light, awning shadow | Golden hour through the balustrade | Late-afternoon sodium haze, traffic glare | Harmattan white-out, low contrast | Single bulb, deep falloff, beam sweep |
| **Signature mechanic** | **Ruler seesaw**: a ruler pivots on an eraser at midfield and settles to a new angle each turn; a chalk arrow shows the next angle | **Change dish**: a rotating saucer in each goal mouth turns one notch per turn, so its gap guards a different part of the goal | **Pot maze + bank rule**: low clay pots form three routes; goals only count after a pot bank | **Toll gates**: three lanes per plaza, one boom down per turn on a visible cycle; amber warns which lane shuts next; caps slide under booms, the ball can't; a ball under a boom jams it | **Departing lorry**: each goal rides a toy lorry along the end line, one of five stops per attacker turn, turning back at the far stops; a ghost goal shows the next stop | **Lights-on chain**: strike three coin stacks in beam order to unlock Magic's padlocked goal |
| **Mechanic family** | Moving rebound surface | Rotating defender | Tactical maze + ricochet challenge | Opening/closing lane + tactical jam | Moving goal | Target chain + multi-stage shot |
| **Objective** | Score before the bell | Score through the dish gap | Win with bank goals only | Beat Akosua through the booms | Score before the lorry leaves | Light the bulb, then beat Magic |
| **Hero moment** | RULER BANK | EXACT CHANGE | OFF THE POT | THROUGH THE TOLL · BOOM BANK · JAMMED THE GATE | CAUGHT THE LORRY | LIGHTS ON |
| **Rival tendency** | Straight shooter, ignores the ruler | Waits for the gap to face her | Always looks for the bank | Toll collector: blocks your next lane | Chases the goal, over-hits | Sets up the chain two turns ahead |
| **Ambient sound** | Playground chatter, the school bell | Market calls, a radio | Birds, a pot lid, church bells | Engines, trotro horns, boom clacks | Wind, flapping tarp, lorry engine | Waves, bulb buzz, a distant highlife |
| **Opening camera** | Low across the desks toward the bell tower | Through the hatch | Down from the balustrade | Under the toll canopy, down the lanes | Out of the dust, from the lorry cab | Up from the sea wall into the bulb |

## Three acts per venue (pattern)
1. **Discover**: a solo situation where the mechanic is the only moving part.
2. **Master**: the rival plays and exploits the mechanic.
3. **Showdown**: first to two, with one extra complication.

## Implemented: Roadside Showdown — Toll Gates

**How it works**
- Each half has a toll plaza across the approach to its goal (`x = ±0.68`): two booths make three lanes, and each lane has a red-and-white boom.
- **One boom per plaza is down; two lanes are open.** Each time a plaza's attacker starts a turn, the lowered boom steps **left → centre → right → centre**, so every attacker meets the full rhythm. The two plazas are offset.
- Traffic-light semantics. **Green** lamp and floor pool: open. **Blinking amber**: open now, shuts on your next shot. **Red**: down.
- **Scale rule:** a bottle cap (0.024 tall) slides *under* a boom arm (0.052 up). The paper ball (0.07 across) does not. Caps roam to set up and to block lanes with their bodies; only the ball has to find an open lane.
- A boom can't come down on the ball resting beneath it: it **jams open**, so for that turn all three lanes are open.
- Booms are circle chains in the same physics that block only the ball. Lowered booms are bank surfaces. Nothing moves during a flick.

**Decisions it creates (not available on the classic table)**
- Shoot now through the amber lane before it shuts, or set the ball up in front of a lane that stays green.
- Slide a cap under a boom and park it in the lane the rival needs, or attack.
- Leave the ball under the next boom to jam it. Bank off the lowered boom into an open lane.

**Acts**: 1 *Green Means Go* (solo; ball starts at the plaza; keeper + two back caps; score in 8), 2 *Rush Hour* (first to 1, 14 flicks, medium Akosua), 3 *Last Toll Before the Motorway* (first to 2, 16 flicks, medium aim with sharper toll-collector tactics, bottle in the road).

**Hero moments**: THROUGH THE LEFT/CENTRE/RIGHT TOLL, BOOM BANK, JAMMED THE GATE. Each gets the replay; generic contacts do not.

**AI**: rehearses shots on the cloned table (booms included), aims candidates through open lanes, and tries blocking moves into the open lane the ball faces. It rewards setups in front of a lane still open on its next turn and penalises leaving the ball lined up for the player. In solo acts the defensive terms are off. Akosua's weights: block 1.6, setup 0.8, caution 1.3.

**Balance history (headless, medium bot as the player proxy)**: see `plans/reports/playtest-260922-street-legends-roadside-toll-gates.md`.

## Implemented: Harmattan Haze — Departing Lorry

**How it works**
- Behind each goal a toy "mammy wagon" lorry (BOLGA EXPRESS, SEA NEVER DRY) drives along the end of the table. The goal rides in front of its side boards.
- Five stops on a painted track: far left, left, centre, right, far right. Both lorries sit at the centre until their attacker's first turn, then pull out in opposite directions and ping-pong.
- A lorry moves one stop each time its **attacker** starts a turn, so you always shoot at a still goal. A **ghost goal** marks the next stop, a chevron shows the direction, and the HUD reads "Their lorry: LEFT → next FAR LEFT · Your goal next: RIGHT". Input waits until the lorry stops.
- Physics: `physics.goalCenters[±1]` moves the goal mouth; the goal-post bodies slide with it. The AI planner and the slow-motion trigger read the moved mouth.
- Hero labels: CAUGHT THE LORRY (off-centre stop), LAST STOP! (far stop). Both earn the replay.

**Decisions it creates**: shoot now, or set the ball up for where the lorry will be *next*. Slide your keeper across to where your own goal is going. Hold for the far stop for the big label.

**Acts**: 1 *Catch the Lorry* (solo, keeper only, ball starts near the end, score in 8), 2 *Loading Bay* (first to 1, 18 flicks), 3 *Last Lorry to Bolgatanga* (first to 2, 20 flicks, pebbles). Abdul chases the goal: setup 1.5, block 0.8, caution 0.8.

## Build order for the remaining four
See `plans/260922-1136-street-legends-roadside-toll-gates/plan.md`.
