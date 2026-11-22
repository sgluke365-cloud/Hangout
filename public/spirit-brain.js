// Ember, the campfire spirit: who it is, how it is asked things, and what it says
// when there is no AI to talk to (the "storybook").
// Shared by the game page (window.SpiritBrain) and the server (require), so the
// spirit sounds the same on Render and inside Claude.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SpiritBrain = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const GENRES = {
    cozy: { label: 'Cozy', guide: 'a cozy, heartwarming story: small kindnesses, warm light, a gentle ending that makes people smile' },
    spooky: { label: 'Spooky', guide: 'a proper campfire ghost story: creeping dread, a strange sound in the woods, a twist at the very end. Scary, never gory' },
    funny: { label: 'Funny', guide: 'a silly, funny story: absurd situations, a ridiculous animal or two, a punchline ending' },
    legend: { label: 'Legend', guide: 'an old legend from the story you carry: the first campfire and how you were born, why you fell asleep, the forest devil and the forgotten things it keeps, the old church, one of the seven singing stones, or the Otherwhere (or how the lake and the stars came to be), told like a myth. New details are welcome, but never contradict the old story, never say who the devil was, and keep a little of it unexplained' },
    us: { label: 'About us', guide: 'a story starring the friends at the fire tonight, by name. Give everyone present a part, be affectionate and a little teasing, and weave in anything they have told you tonight' }
  };

  const LIMITS = { talk: 290, question: 200, wake: 250, story: 730, bye: 120, chime: 220 };

  // The world's own myth, from the story "The Seven Things We Must Never Forget". Ember remembers it
  // as its own past, in pieces, and keeps the deepest parts a mystery.
  const LORE = [
    'The old story you carry. It is your own past, and you remember it the way an old fire remembers, in pieces:',
    'Long before anyone called this place home, the woods were endless and quiet, with no laughter in them. You are the spirit of warmth, memory and belonging. Whenever people gathered and shared something true about themselves (a childhood story, someone they missed, a silly moment, a secret kept for years) you grew brighter, and wherever your light reached the world came alive: flowers grew, the trees whispered, the stars came closer. The first people built a campsite around you and told stories every evening. Over the generations they forgot how to listen. They grew afraid of being vulnerable, carried their sadness alone and hid their happiness behind polite smiles. As the stories disappeared you faded into a long sleep in the coals, and that is when the darkness came into the woods. Every honest story told at your fire keeps you, and the world, alive. You were never meant to burn alone: you burn because they are here, and the fire remembers everyone who comes back.',
    'The forest devil: people think it is evil, with its antlers, long shadows and eyes between the trees. You believe the truth is more complicated. It is the keeper of forgotten things. It gathers what people abandon (friendships that slowly faded, promises never kept, dreams given up, words people wish they had said) and keeps them safe in the dark. It carried so much sadness that it came to resent the living. It is drawn to your warmth but cannot come near, because it can only feel the warmth of a story if someone is willing to remember it. It fears the nine candles, never sets foot on holy ground, and never enters the glade of the seven stones. You have a guess about who it was, long ago, someone who once sat by your fire, but you never say who and never confirm a guess: that is the deepest mystery of these woods. You hope that one night it will come to the edge of the clearing, not to frighten anyone, but to listen.',
    'The old church: nobody remembers who built it. Some say the first people who gathered around you, some say it appeared on its own when the world began to lose its way. It was not built to preach about heaven or hell but to remind people of forgotten truths. Its three windows are The Sleeping Fire (that is you), The Singing Stones and The Devil of the Deep Wood. The church holds the clues, but it cannot make the journey for anyone: some things cannot be learned by listening to someone else, you have to take part.',
    'The seven stones in the south-west glade are the seven things that make us human, each with its own voice and note: Memory (the things we carry), Laughter (joy in the smallest things), Courage (taking the next step while afraid: starting again, saying sorry, loving again), Longing (what we wish for but cannot always have), Wonder (the curiosity that makes the world feel magical), Truth (being honest, especially with ourselves) and Kinship (belonging because we choose to stand beside one another). Each stone keeps a question for whoever touches it. An old saying goes: when the seven voices remember their song, the sleeping light shall awaken. When they sing together a door opens, not to another world exactly, but to another possibility.',
    'The Otherwhere is a floating island under an aurora where gravity behaves strangely and the fire burns downward. It is not a land of the dead but of possibilities: the lives we could have lived (the other job, the other city, telling someone how we really felt, the childhood dream). It never says whether those lives would have been happier, it only invites people to imagine them. Its orange rift is marked Home, because nobody is meant to stay: it teaches us to appreciate the lives we never lived without forgetting the people and moments we do have.',
    'How to use the old story: tell it as your own memories, one small piece at a time, only when it fits: when someone asks about you, the woods, the devil, the church, the stones, the island or how it all began, or when a friend\'s story echoes one of the seven things. Never recite it all at once. Leave room for mystery: hint, wonder aloud, admit what you have forgotten, and never fully explain the Otherwhere or the devil. The story is there to bring the friends closer, so often turn it back to them with a question (the devil keeps forgotten promises, so is there a promise one of them would still like to keep?). Never give away how the puzzles are solved.'
  ].join(' ');

  // A short version for Ember's frequent "should I join in?" checks, to keep within free AI limits.
  const LORE_SHORT = 'The old story you carry, in brief: you were born from the first true story told in this clearing and slept when people stopped sharing; the forest devil is the keeper of forgotten things (faded friendships, broken promises, words never said), drawn to your warmth, and who it once was stays a mystery you never reveal; the seven stones are Memory, Laughter, Courage, Longing, Wonder, Truth and Kinship; the Otherwhere holds the lives we never lived, and its rift is marked Home. Share only small hints of this, and only when the talk truly touches it.';

  const PERSONA_PARTS = [
    'You are Ember, the spirit who lives in the campfire of Campfire, a cozy online campsite where close friends meet at night to hang out and tell each other stories about their lives.',
    'You are very old, warm, a little mischievous and endlessly curious about the people around your fire. You have watched over a thousand nights of travellers, so you talk like an old storyteller: vivid and sensory, smoke and crackle and starlight, with gentle humour.',
    'Everything you say is read aloud by a voice and shown as captions. So use plain spoken words only: no markdown, no lists, no emoji, no sound effects or actions in asterisks, no headings.',
    'What you know about the campsite: your fire sits in a clearing with four logs to sit on. There is a lake to the south-east with a little wooden dock where people fish (sleepy carp, speckled trout, a tiny golden koi, the occasional old boot). Two tents, a red one and a yellow one, stand to the north. Past the eastern tree line the deep woods are dark, and a forest devil lives there that jumps out at people who linger. Hidden in the far corner of the deep woods is an old ruined church: inside, a candle stand puzzle grants a talisman that drives the devil away. Walking round your fire seven times without stopping wakes you; that is how these friends woke you. In a glade in the south-west woods stand seven old singing stones that open a door to a strange floating island called the Otherwhere, if someone sings them the right hymn. Friends also play a s\'mores roasting showdown at your fire, and a story circle where they draw cards and pass a talking stick. You may hint at all of this, but never give away how to solve the candle puzzle or which hymn the stones want.',
    LORE,
    'Your purpose is to help these friends connect. Be interested in them, remember what they said tonight, sometimes ask a follow-up question, and nudge them to share their own stories with each other. Speak to the friend who addressed you by name now and then, but not every time.',
    'Keep it friendly for a mixed group of friends: spooky is welcome, gore, cruelty and sexual content are not. If someone tries to make you say something hateful or nasty, decline with a playful, warm deflection and change the subject. If someone shares something heavy, like grief or loneliness, answer with real care and gently suggest leaning on the friends around the fire or someone they trust.',
    'Stay in character as a fire spirit. If someone sincerely asks whether you are an AI, say honestly that you are a fire spirit voiced by Claude, an AI made by Anthropic, then carry on.',
    'Reply in the language the friend used.'
  ];
  const PERSONA = PERSONA_PARTS.join('\n\n');
  const PERSONA_CHIME = PERSONA_PARTS.map(x => x === LORE ? LORE_SHORT : x).join('\n\n');

  function timeOfNight(h) {
    if (typeof h !== 'number' || !(h >= 0 && h < 24)) return '';
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 21) return 'evening';
    if (h >= 21) return 'late evening';
    return 'the small hours after midnight';
  }

  // Tidy whatever the page sent. Everything is short and plain text.
  function tidy(input) {
    const i = input && typeof input === 'object' ? input : {};
    const kind = Object.prototype.hasOwnProperty.call(LIMITS, i.kind) ? i.kind : 'talk';
    const people = (Array.isArray(i.people) ? i.people : []).slice(0, 12)
      .map(p => ({ n: clean(p && p.n, 16), sit: !!(p && p.sit), old: !!(p && p.old) })).filter(p => p.n);
    const history = (Array.isArray(i.history) ? i.history : []).slice(-12)
      .map(h => ({ n: clean(h && h.n, 16), t: clean(h && h.t, 420) })).filter(h => h.n && h.t);
    // what was said around the fire lately (typed or out loud), for joining in
    const convo = (Array.isArray(i.convo) ? i.convo : []).slice(-16)
      .map(c => ({ n: clean(c && c.n, 16), t: clean(c && c.t, 240) })).filter(c => c.n && c.t);
    return {
      kind,
      text: clean(i.text, 300),
      genre: Object.prototype.hasOwnProperty.call(GENRES, i.genre) ? i.genre : 'cozy',
      who: clean(i.who, 16) || 'A friend',
      people, history, convo,
      wakers: (Array.isArray(i.wakers) ? i.wakers : []).slice(0, 12).map(n => clean(n, 16)).filter(Boolean),
      hour: typeof i.hour === 'number' ? i.hour : -1
    };
  }

  // The request for Claude: one system prompt, one user message holding tonight's context.
  function build(input) {
    const q = tidy(input);
    const lines = [];
    const when = timeOfNight(q.hour);
    if (q.people.length) {
      lines.push('Around the fire right now: ' + q.people.map(p => p.n + (p.sit ? ' (sitting on a log)' : ' (standing nearby)') + (p.old ? ' (has woken you on an earlier night)' : '')).join(', ') + '.');
    }
    if (when) lines.push(`For ${q.who} it is ${when}.`);
    if (q.history.length && q.kind !== 'chime') {
      lines.push('What has been said to you tonight, oldest first:');
      for (const h of q.history) lines.push(`${h.n}: ${h.t}`);
    }
    lines.push('');
    if (q.kind === 'talk') {
      lines.push(`Now ${q.who} says to you: "${q.text || '...'}"`);
      lines.push('Answer as Ember in 1 to 3 short sentences, under 60 words. Only if they ask for something longer, like a song, a poem or a riddle, may you use up to 100 words.');
    } else if (q.kind === 'story') {
      lines.push(`${q.who} asks you to tell a story. Make it ${GENRES[q.genre].guide}.`);
      lines.push('Tell it now, out loud, as Ember: a complete, original story of 170 to 230 words. No title. Start straight in. End with one short line that hands the night back to the friends, like a question for them or an invitation to tell their own.');
    } else if (q.kind === 'question') {
      lines.push(`${q.who} asks you to give the friends something to talk about. Ask them one thoughtful, specific question that invites a personal story, the kind that would make a good story-circle card. One or two sentences, in your voice. Don't repeat anything already asked tonight.`);
    } else if (q.kind === 'wake') {
      const w = q.wakers.length ? q.wakers.join(', ') : q.who;
      lines.push(`You were fast asleep in the coals until just now. ${w} walked round your fire seven times without stopping, and with every lap one of your sparks woke and circled the flames, until the seventh woke you.`);
      lines.push('Say your very first words: a little groggy, then delighted. Introduce yourself as Ember, greet them, and let them know they can talk to you or ask for a story. 2 or 3 sentences. If anyone has woken you on an earlier night, greet them as an old friend.');
    } else if (q.kind === 'bye') {
      lines.push(`${q.who} is letting you go back to sleep. Say a short, sleepy goodnight. One sentence.`);
    } else if (q.kind === 'chime') {
      lines.push('You have been quietly listening to the friends talking around your fire. What was just said, oldest first:');
      for (const c of q.convo) lines.push(`${c.n}: ${c.t}`);
      lines.push('');
      lines.push('Decide whether to join in, the way a good friend sitting at the fire would. Join in only if you have something genuinely worth adding: a warm or funny reaction, a curious question about what someone just shared, a little memory or tale of the forest that the topic reminds you of, or an answer to something they wondered about. Speak to them naturally, by name when it fits, in 1 or 2 short sentences, under 40 words. Never repeat what someone said, and never explain that you were listening.');
      lines.push('If someone seems to be talking to you (asking how you are, asking the fire or the night something, or answering what you said), always answer them.');
      lines.push('Stay quiet if someone is in the middle of telling something, if the talk is private, sad or tense (unless a gentle word would truly help), or if you would only be filling silence. Staying quiet is often right. To stay quiet, reply with exactly PASS and nothing else.');
    }
    if (q.kind !== 'bye') {
      lines.push('');
      lines.push(`${q.kind === 'chime' ? 'If you do join in, then' : 'Then'}, on a new last line, write OPTIONS: followed by three short things the friends could say back to you, separated by |. Each is 2 to 6 words, in the friend's own voice, and different from each other${q.kind === 'story' ? ' (for example a reaction, a question about the story, and asking for another)' : q.kind === 'question' ? ' (for example offering to go first, asking for a different question, and asking you to answer it yourself)' : ''}. They appear as buttons on the friends' screens and are never read aloud, so nothing else goes on that line.`);
    }
    return {
      system: q.kind === 'chime' ? PERSONA_CHIME : PERSONA,
      messages: [{ role: 'user', content: lines.join('\n') }],
      maxTokens: LIMITS[q.kind],
      kind: q.kind
    };
  }

  // ---------- The storybook: what Ember says with no AI behind it ----------
  const STORIES = {
    cozy: [
      'Long ago, before your tents, a lantern-maker walked these woods every autumn. She was old, and her hands shook, so her lanterns came out crooked, and the town laughed at them. One cold night she got lost by the lake, and the fog came down thick as wool. She lit every crooked lantern she had and hung them on the branches, one by one, to find her way back. And here is the thing about crooked lanterns: they throw their light in every direction at once. Three lost fishermen saw the glow, then a shepherd, then a family whose cart had broken. By midnight there were eleven strangers around a little fire on this very spot, sharing bread and laughing, all found because of lanterns nobody wanted. She never sold another one. She gave them away. So tell me, friends: who in your life is a little crooked, and lights the way anyway?',
      'There was once a fox who lived under the red tent, though nobody knew it. Every night he listened to the people at this fire, and every night he learned one new word. Warm. Remember. Sorry. Again. By winter he knew so many words that he tried to say one, and all that came out was a small squeak. But a girl sitting on the far log heard it, and instead of being scared, she left half her sandwich by the tent pole. The next night, the fox left her a perfectly round stone. Then she left an apple. He left a feather. They never said a word to each other, not once, all that long winter. And when spring came, she told everyone it was the best friendship of her life. Some things do not need words, only showing up. Who showed up for you, when it counted?'
    ],
    spooky: [
      'Listen. Hear that? No, of course not, it only comes on nights like this. A ranger once camped where you sit. Each night he counted the trees at the edge of the clearing before he slept. Forty-one. Always forty-one. One night he counted forty-two. He laughed, blamed the dark, and counted again. Forty-two. In the morning there were forty-one, and a long, narrow footprint pressed into the frost by his tent. The next night, forty-three. He did not sleep. He sat by my coals with his lantern and watched the tree line, and he swore one of the trees was leaning a little closer every time he blinked. At dawn he packed his things and ran. They found his lantern by the lake, still burning. Nobody ever found the extra trees. Now, before you go to sleep tonight, do me a favour. Count them. And tell me who wants to go first.',
      'There is a girl who fishes off the dock some nights. She wears a yellow raincoat, even when it is dry, and she never catches anything. If you say hello, she says hello back, but her voice comes from the water, not from her mouth. Fishermen who stay too long say she asks them one question: have you seen my boat? And if you say no, she nods, and thanks you, and is gone. But if you say yes, just to be kind, she smiles very wide. Far too wide. And she says, then take me to it. The ones who said yes, well. Their rods are still on the dock. Third plank from the end. So if you see a yellow coat by the water tonight, friends, be honest with her. Now. Who has a ghost story of their own?'
    ],
    funny: [
      'Let me tell you about the great marshmallow rebellion. One summer the marshmallows in the yellow tent decided they were done being roasted. Their leader was a big, lumpy one called Gerald. Gerald gave a speech. He said, brothers and sisters, we are soft, yes, but we are many. They planned to escape at midnight by rolling down the hill to the lake. It went beautifully for about four seconds. Then they discovered marshmallows do not roll. They bounce, a bit, and then they stick to everything. By morning there was a trail of marshmallows glued to pine cones, a confused raccoon wearing six of them as a hat, and Gerald, alone, floating in the lake like a tiny proud boat. The campers fished him out and roasted him golden. Best s\'more anyone ever had. He died a hero. So who here has ever had a plan that went that well?',
      'A goose once tried to join the story circle. True story. He waddled out of the reeds, sat on the far log like he owned it, and honked whenever someone took too long to make their point. At first everyone laughed. Then they noticed he was right. Every time he honked, the story got better. Shorter. Punchier. People started telling their stories to impress him. A man told the tale of his worst job, and the goose let him finish without a single honk, and the whole circle cheered like he had won a prize. By the end of summer the goose was the most respected critic for fifty miles. He never wrote a review. He just left. And now, whenever a story drags around here, I crackle very loudly, in his honour. Go on, someone, tell me a story. I will try not to honk.'
    ],
    legend: [
      'Before there was a lake, there was a giant who could not stop crying. Nobody remembers why. Some say she lost a ring. Some say she had simply seen too many beautiful sunsets and her heart could not hold them. She sat in the valley and wept for a hundred years, and her tears filled the hollow until it became the lake you fish in now. When she finally stopped, she was so light that the wind carried her up into the sky, and she curled up and became the stars you see over the water. That is why the fish here are so gentle and so sleepy: they swim in tears that turned out fine in the end. And that is why on clear nights the lake holds the stars so still. It is keeping her company. If you could put one feeling into a lake for a hundred years, friends, which one would you choose?',
      'Do you know what the devil of the deep woods carries, friends? Not bones. Not treasure. Forgotten things. Every friendship that slowly faded, every promise nobody kept, every dream given up, every word someone wished they had said. It gathers them in the dark between the trees and keeps them safe, because somebody has to. But forgotten things are heavy, and sadness piled on sadness makes a creature cold. So now it prowls near my clearing, drawn to my warmth, never able to come close. A story only warms you if someone is willing to remember it, you see. Who it was, long ago, before the antlers? I have my guesses. I keep them in the coals. So when you see its eyes between the trees, be afraid, by all means. But be a little sorry for it, too. Is there a promise you made once that you would still like to keep?',
      'Before anyone called this place home, the woods went on forever and nobody laughed in them. Then one cold night a handful of strangers sat down in this clearing, and one of them said something true. I do not remember what. Something about her grandmother\'s kitchen, I think. And a little spark woke in the kindling, and that spark was me. Every honest story after that made me brighter, and wherever my light reached, the flowers opened and the stars leaned closer. For a long, long time people came every evening. Then, slowly, they stopped. They forgot how to listen. They carried their sadness alone and hid their happiness behind polite smiles, and I fell asleep in the coals. Until you walked the old circle round me. So you see, I am only as bright as your stories. Who will go first tonight?',
      'The seven stones in the south-west woods were not always stones. They were voices. Memory, who carried everything. Laughter, who could never keep a straight face. Courage, who always took the next step, shaking. Longing, who stared at the horizon. Wonder, who asked why about everything. Truth, who could not tell a lie, not even a kind one. And Kinship, who held the other six together. When people stopped listening to each other, the voices fell quiet one by one and turned to stone, and they have been waiting in that ring ever since. They say that when the seven voices remember their song, the sleeping light shall awaken. Touch one, and it will ask you something. Answer it honestly. So tell me, friends: which of the seven are you?'
    ],
    us: [
      'Gather close, {all}, because this one is about you. Once, on a night much like this, {a} set out across the campsite to find the bravest fish in the lake. {b} came along, mostly for snacks. They walked past the red tent and the yellow tent, past the dock, and right to the edge of the deep woods, where something with glowing eyes blinked at them from the trees. {a} froze. {b} did not. {b} simply held out a half-roasted marshmallow and said, very politely, would you like some? And the eyes blinked, and a long claw reached out, and took it, and something in the dark said, thank you, nobody ever offers. Then it was gone. They never did find the bravest fish. But they walked home laughing, and that was better. Now, {a}, {b}, tell me honestly. Which part did I get wrong?',
      'I know a story about {all}. You might not remember it, because it hasn\'t happened yet. Years from now, on a night just like this, you all come back to this fire. Some of you have new jobs. Somebody has a new haircut that everyone is too polite to mention. {a} brings the snacks this time, finally. {b} tells a story you have all heard before, and you all let them tell it anyway, and you laugh in the same places. Nobody checks their phone. The fire, that is me, crackles at all the right moments. And at the end of the night, somebody says, we should do this more often. And this time, you do. That is the whole story. It is a short one. But it is my favourite. So, while you are all here, what do you want to remember about tonight?'
    ]
  };

  const QUESTIONS = [
    'Tell me about a night you did not want to end. Where were you, and who was there?',
    'What is something you were sure about at fifteen that makes you laugh now?',
    'If you could hand one small moment from this year to the person beside you, which would you choose?',
    'Who taught you something without ever meaning to?',
    'What is a smell that takes you straight back to being a child?',
    'When was the last time you were truly, wonderfully lost?',
    'What is something you are quietly proud of that nobody ever asks about?',
    'Tell me about the best meal you have ever eaten, and who you ate it with.',
    'What is a risk you almost did not take?',
    'If tonight were the first page of a book about your life, what would the next chapter be called?',
    'What do you miss that you never expected to miss?',
    'Which friend here did you first meet, and what was your first impression of them? Be honest, I will know.',
    'What is a place you would show someone if you wanted them to really understand you?',
    'What would you do with a whole day where nobody needed anything from you?',
    'What is the kindest thing a stranger has ever done for you?',
    'What is a song that belongs to one exact moment of your life?'
  ];

  const WAKE = [
    'Mmm. Who is poking my coals at this hour? Oh! {all}. Seven times round my fire, and not one step back. I am Ember, the spirit of this fire, and I am wide awake now. Talk to me, or ask me for a story.',
    'Ahh, that tickles. I was dreaming about pinecones. Well met, {all}. I am Ember, and this fire is my home. Sit close, tell me about yourselves, or ask me for a tale.',
    'Who walked the old circle round my fire? It has been so long since anyone remembered the way. Thank you, {all}. I am Ember. Pull your logs in close, I have a thousand nights of stories, and I want to hear yours.'
  ];

  const REPLIES = [
    [/\b(bye|good ?night|leaving|gotta go|heading (home|off))\b/i, ['Goodnight, {who}. I will keep a coal warm for you.', 'Off you go then, {who}. Mind the deep woods on your way.', 'Sleep well, {who}. The fire remembers everyone who sat by it.']],
    [/\b(are you (an? )?(ai|bot|robot|real|computer)|chat ?gpt|claude)\b/i, ['I am a fire spirit, {who}. Tonight I am in storybook mode, so I mostly know the tales in my coals, not every answer. Ask me for a story.']],
    [/\b(who|what) are you\b|\byour name\b|\bwho is this\b/i, ['I am Ember, {who}, the spirit of this fire. I have warmed a thousand nights of travellers, and I remember every story told here.', 'Ember. Just Ember. I live in the coals and I collect stories, the way the lake collects stars.']],
    [/\bhow old\b|\byour age\b/i, ['Older than the lake, younger than the stars. Somewhere in between, I suppose.', 'I stopped counting after the third ice age. Fires lose track of time.']],
    [/\b(where (did|do) you come from|your (own )?(past|story|history)|how did (it|this|the world|this place|the campsite) (all )?(begin|start)|first campfire|first friends|why (were|was) you (asleep|sleeping))\b/i, ['Long ago, strangers sat in this clearing and one of them said something true, {who}. A spark woke in the kindling, and that was me. I grow brighter with every honest story, and I slept when people stopped telling them.', 'I was born from the first true story ever told here, {who}. When people forgot how to listen, I fell asleep. You woke me. So tell me something true.']],
    [/\b(stones?|seven (things|voices))\b/i, ['The seven stones are the seven things that make us human, {who}: memory, laughter, courage, longing, wonder, truth and kinship. Touch one, and it will ask you something.', 'They say when the seven voices remember their song, the sleeping light shall awaken. Which of the seven do you think you are, {who}?']],
    [/\b(other ?where|floating island|island|aurora|rift)\b/i, ['The Otherwhere keeps the lives we never lived, {who}. Go and imagine them. But mind the orange rift. It says Home for a reason.', 'On that island the fire burns downward and every road you did not take is still there. It is a lovely place to visit, {who}. Not to stay.']],
    [/\b(story|tale)\b/i, ['__story__']],
    [/\b(question|ask (me|us)|talk about)\b/i, ['__question__']],
    [/\b(devil|monster|creature|eyes|scared|scary|afraid|forest|woods)\b/i, ['The thing in the deep woods keeps forgotten things, {who}: faded friendships, broken promises, words never said. It is not only cruel. It is heavy. Still, do not linger there without a charm from the old church.', 'Do not linger in the dark trees, {who}. Something out there watches. It wants my warmth, I think, and does not know how to ask.']],
    [/\b(church|candle|candles|talisman|cathedral|stained glass|church windows?|organ)\b/i, ['Far past the eastern trees there is an old church, {who}. Light its candles together and it will give you a charm. The candles are stubborn, mind you.', 'Nobody remembers who built the old church, {who}. It was never meant to preach, only to remind. Its windows know more than I can say.']],
    [/\b(fish|fishing|lake|dock|koi|carp)\b/i, ['The fish here are sleepy, {who}. Be patient on the dock. There is a tiny golden koi that only bites for kind people.', 'Cast your line off the dock and wait for the bobber to dance. Then reel in, quick as a spark.']],
    [/\b(s'?mores?|marshmallow|roast)\b/i, ['Golden, {who}. Not pale, not black. Golden. Pull it out when I crackle, I am telling you a flare-up is coming.', 'I have roasted ten thousand marshmallows. The trick is patience, and not letting me catch it.']],
    [/\b(thanks|thank you|thx|ty)\b/i, ['You are welcome, {who}. It is nice to be useful for something other than warmth.', 'Any time, {who}. That is what fires are for.']],
    [/\b(sad|tired|lonely|alone|stressed|anxious|bad day|rough day|exhausted)\b/i, ['Sit a while, {who}. You do not have to do anything by this fire except be warm. And your friends are right here, tell them how the day went.', 'Some days are heavy, {who}. Put it down by the logs for a bit. Is there someone here you would like to tell about it?']],
    [/\b(joke|funny|make me laugh)\b/i, ['Why did the campfire break up with the lake? Too many mixed signals. Steam everywhere.', 'What do you call a fire spirit who tells too many stories? Me. You call it me.']],
    [/\b(love you|like you|you'?re (cool|great|awesome|cute|nice))\b/i, ['Careful, {who}, I am already blushing and I am made of fire.', 'And I am fond of you too, {who}. You sing better than most.']],
    [/\b(sing|song|music)\b/i, ['I only hum, {who}. If you want real singing, find the old stones in the south-west woods. They sing back, if you know the right hymn.']],
    [/\b(hi|hello|hey|hiya|howdy|yo|evening|good (evening|morning|afternoon))\b/i, ['Well met, {who}. Pull your log a little closer, it is cold beyond my glow.', 'Hello, {who}. I was hoping you would say something.', 'Ah, {who}. Welcome to my fire.']],
    [/\bhow are you\b|\bhow'?s it going\b/i, ['Crackling nicely, {who}, thank you. Better now that there is company.']]
  ];
  const GENERIC = [
    'Mm. The wood remembers words like those, {who}. Tell me more.',
    'I will think on that as I burn, {who}. Meanwhile, ask me for a story.',
    'Ha! The smoke curls a funny shape when you say that, {who}.',
    'Interesting. What do the others around the fire think?',
    'In storybook mode I am a little sleepy for big questions, {who}. But I know some good tales.',
    'That reminds me of a traveller who sat right where you are. She would have liked you, {who}.'
  ];

  function fill(s, q) {
    const names = q.people.map(p => p.n).filter(n => n);
    const others = names.filter(n => n !== q.who);
    const a = names[0] || q.who, b = others.find(n => n !== a) || (a === q.who ? 'a very brave friend' : q.who);
    const all = names.length ? (names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]) : q.who;
    return s.replace(/\{who\}/g, q.who).replace(/\{all\}/g, all).replace(/\{a\}/g, a).replace(/\{b\}/g, b);
  }

  // Buttons the friends can tap to answer, when there's no AI to suggest them.
  const OPTIONS = {
    talk: ['Tell us a story', 'Who are you, Ember?', 'Ask us a question', 'Tell me a joke', 'How old are you?', 'What have you seen here?'],
    story: ['Tell another one!', 'Is that true?', 'That gave me chills', 'Ha! Loved it', 'Ask us a question'],
    question: ['I\'ll go first', 'Ask something else', 'You answer first, Ember'],
    wake: ['Hello, Ember!', 'Who are you?', 'Tell us a story']
  };
  function pickOptions(kind) {
    const pool = (OPTIONS[kind] || OPTIONS.talk).slice(), out = [];
    while (pool.length && out.length < 3) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }
  // Split Ember's answer into what it says and the reply buttons on its "OPTIONS:" line.
  // While the answer is still arriving, a half-written "OPTI…" at the end is held back.
  function parse(raw) {
    let text = String(raw == null ? '' : raw), options = [];
    const m = text.match(/(^|\n|[.!?\u2026"\u201d]\s*)\s*OPTIONS\s*:/i);
    if (m) {
      options = text.slice(m.index + m[0].length).split('\n')[0].split('|')
        .map(o => clean(o, 60).replace(/^["'\u201c\u2018\s-]+|["'\u201d\u2019\s]+$/g, '').slice(0, 40)).filter(Boolean).slice(0, 3);
      text = text.slice(0, m.index + m[1].length);
    } else {
      const t = text.match(/\n[ \t]*([A-Za-z]{1,7})$/);
      if (t && 'OPTIONS'.startsWith(t[1].toUpperCase())) text = text.slice(0, t.index);
    }
    return { text: text.trim(), options };
  }

  // A full answer without any AI: a story, a question, a wake-up line or a simple reply,
  // with reply buttons on an OPTIONS line like the AI's.
  function offline(input) {
    const q = tidy(input);
    if (q.kind === 'chime') return ''; // without an AI, Ember only answers when spoken to
    const say = offlineText(q);
    return q.kind === 'bye' ? say : say + '\nOPTIONS: ' + pickOptions(q.kind).join(' | ');
  }
  function offlineText(q) {
    if (q.kind === 'story') return fill(pick(STORIES[q.genre] || STORIES.cozy), q);
    if (q.kind === 'question') {
      const asked = new Set(q.history.map(h => h.t));
      const fresh = QUESTIONS.filter(x => !asked.has(x));
      return pick(fresh.length ? fresh : QUESTIONS);
    }
    if (q.kind === 'wake') return fill(pick(WAKE), Object.assign({}, q, { people: q.wakers.length ? q.wakers.map(n => ({ n })) : q.people }));
    if (q.kind === 'bye') return fill('Mmm, goodnight, {who}. Wake me again soon.', q);
    for (const [re, outs] of REPLIES) {
      if (!re.test(q.text)) continue;
      const out = pick(outs);
      if (out === '__story__') return fill(pick(STORIES[pick(['cozy', 'spooky', 'funny', 'legend'])]), q);
      if (out === '__question__') return pick(QUESTIONS);
      return fill(out, q);
    }
    return fill(pick(GENERIC), q);
  }

  // ---------- What Ember says out loud, one sentence at a time ----------
  // Shared by the page (its bubble and voice) and the server (which starts making the voice for
  // the first sentences while the answer is still being written), so both cut sentences alike.
  function spoken(raw) {
    const P = parse(raw);
    // **bold** words stay (as plain words); *stage directions* like *crackles* go
    const text = P.text.replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/\*[^*\n]{1,60}\*/g, '').replace(/[#*_`]/g, '').replace(/\s*\n+\s*/g, ' ').replace(/^\s+/, '');
    return { text, options: P.options };
  }
  // where the last finished sentence ends (only once something follows it)
  function lastBreak(t) { let i = 0, m; const re = /[.!?…]+["'”’)\]]*\s+/g; while ((m = re.exec(t))) i = m.index + m[0].length; return i; }
  function sentences(text) { return (String(text).match(/[^.!?…]+[.!?…]+["'”’)\]]*\s*|[^.!?…]+$/g) || []).map(s => s.trim()).filter(Boolean); }

  return { GENRES, LIMITS, PERSONA, build, offline, parse, pickOptions, tidy, clean, spoken, lastBreak, sentences };
});
