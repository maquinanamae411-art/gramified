import { PhaseKey, QuizItem, RelayRole } from '../types';

export interface RelayRoleInfo {
  role: RelayRole;
  icon: string;
  title: string;
  duty: string;
}

export const RELAY_ROLES_INFO: RelayRoleInfo[] = [
  { role: 'READER', icon: '📖', title: 'READER', duty: 'Reads the question or sentence aloud to the group' },
  { role: 'SOLVER', icon: '💡', title: 'SOLVER', duty: "Gives the team's first answer or idea" },
  { role: 'CHECKER', icon: '🔍', title: 'CHECKER', duty: 'Checks if the answer makes sense and verifies evidence' },
  { role: 'EXPLAINER', icon: '🗣️', title: 'EXPLAINER', duty: 'Explains why the answer is correct to the team' },
  { role: 'RUNNER', icon: '🏃', title: 'RUNNER', duty: 'Taps/submits the final answer on the device (baton pass)' },
];

export function getRotatedRoles(members: string[], stepIndex: number): Array<{
  member: string;
  memberIndex: number;
  roleInfo: RelayRoleInfo;
  isCurrentTapRunner: boolean;
}> {
  return members.map((member, mIdx) => {
    // Role shifts with stepIndex
    const roleIdx = (mIdx - (stepIndex % members.length) + members.length) % members.length;
    const roleInfo = RELAY_ROLES_INFO[roleIdx];
    return {
      member,
      memberIndex: mIdx + 1,
      roleInfo,
      isCurrentTapRunner: roleInfo.role === 'RUNNER',
    };
  });
}

// -------------------------------------------------------------
// EXACT PRETEST & POSTTEST ITEMS (6 Parallel Items Each)
// -------------------------------------------------------------
export const PRETEST_ITEMS: QuizItem[] = [
  {
    p: 'Which one is a complete sentence?',
    o: [
      'Running to the market every morning.',
      'Ana runs to the market every morning.',
      'To the market every morning.',
      'Ana, the market, every morning.',
    ],
    c: 1,
    explanation: '"Ana runs to the market every morning." has a subject (Ana) and action (runs) and expresses a complete thought.',
  },
  {
    p: 'Choose the sentence with correct subject-verb agreement.',
    o: [
      'The dogs barks loudly.',
      'The dog bark loudly.',
      'The dogs bark loudly.',
      'The dog barking loudly.',
    ],
    c: 2,
    explanation: 'Plural subject "The dogs" takes the plural base verb "bark".',
  },
  {
    p: 'Arrange the words into a correct sentence: (mango / bought / Jose / a ripe)',
    o: [
      'Bought Jose a ripe mango.',
      'Jose bought a ripe mango.',
      'A ripe mango Jose bought.',
      'Jose a ripe mango bought.',
    ],
    c: 1,
    explanation: 'Standard order is Subject (Jose) + Verb (bought) + Object (a ripe mango).',
  },
  {
    p: "What part of speech is the underlined word? 'The **BRIGHT** star shone at night.'",
    o: ['Noun', 'Verb', 'Adjective', 'Adverb'],
    c: 2,
    explanation: '"BRIGHT" describes the noun "star", so it is an Adjective.',
  },
  {
    p: "What part of speech is the underlined word? 'Maria **SINGS** every afternoon.'",
    o: ['Noun', 'Verb', 'Adjective', 'Pronoun'],
    c: 1,
    explanation: '"SINGS" expresses the action done by Maria, so it is a Verb.',
  },
  {
    p: "Identify the noun in the sentence: 'The children played in the barangay plaza.'",
    o: ['played', 'in', 'children', 'the'],
    c: 2,
    explanation: '"children" names persons, so it is a Noun.',
  },
];

export const POSTTEST_ITEMS: QuizItem[] = [
  {
    p: 'Which one is a complete sentence?',
    o: [
      'Walking home after school.',
      'Pedro walked home after school.',
      'After school, home.',
      'Home after school walking.',
    ],
    c: 1,
    explanation: '"Pedro walked home after school." has a subject (Pedro) and verb (walked) and tells a complete thought.',
  },
  {
    p: 'Choose the sentence with correct subject-verb agreement.',
    o: [
      'The cats chases the rat.',
      'The cats chase the rat.',
      'The cat chasing the rat.',
      'The cat chase the rat.',
    ],
    c: 1,
    explanation: 'Plural subject "The cats" takes the base verb "chase".',
  },
  {
    p: 'Arrange the words into a correct sentence: (a story / the teacher / read / to the class)',
    o: [
      'Read the teacher a story to the class.',
      'The teacher read a story to the class.',
      'A story read the teacher to the class.',
      'To the class a story the teacher read.',
    ],
    c: 1,
    explanation: 'Subject (The teacher) + Verb (read) + Object (a story) + Prepositional phrase (to the class).',
  },
  {
    p: "What part of speech is the underlined word? 'The **SWEET** mangoes are ripe.'",
    o: ['Noun', 'Verb', 'Adjective', 'Adverb'],
    c: 2,
    explanation: '"SWEET" describes the noun "mangoes", so it is an Adjective.',
  },
  {
    p: "What part of speech is the underlined word? 'The pupils **WROTE** a poem.'",
    o: ['Noun', 'Verb', 'Adjective', 'Pronoun'],
    c: 1,
    explanation: '"WROTE" tells the action done by the pupils, so it is a Verb.',
  },
  {
    p: "Identify the noun in the sentence: 'The fisherman sailed across the calm river.'",
    o: ['sailed', 'across', 'calm', 'fisherman'],
    c: 3,
    explanation: '"fisherman" is a person, making it a Noun.',
  },
];

// -------------------------------------------------------------
// MISSION INTERACTIVE CURRICULUM DEFINITIONS
// -------------------------------------------------------------
export interface MissionCurriculum {
  phaseKey: PhaseKey;
  dayNumber: number;
  missionNumber: number;
  title: string;
  subtitle: string;
  domain: string;
  badgeName: string;
  badgeIcon: string;
  briefing: {
    welcome: string;
    objectives: string[];
    tips?: string[];
  };
  iDo: {
    coachMessage: string;
    rules: string[];
    examples: Array<{
      type: 'complete' | 'incomplete' | 'breakdown' | 'parts';
      text: string;
      analysis: Array<{ label: string; text: string; icon: string }>;
      question?: string;
      explanation: string;
    }>;
    guideSummary: {
      title: string;
      steps: string[];
      formula?: string;
    };
    quickCheck: {
      question: string;
      options: string[];
      correct: number;
      explanation: string;
    };
  };
  weDo: {
    coachMessage: string;
    hints: string[];
    challenges: Array<{
      title: string;
      prompt: string;
      options: string[];
      correct: number;
      explanation: string;
    }>;
  };
  youDo: {
    coachMessage: string;
    questions: QuizItem[];
  };
}

export const MISSIONS_CURRICULUM: Record<string, MissionCurriculum> = {
  session1: {
    phaseKey: 'session1',
    dayNumber: 1,
    missionNumber: 1,
    title: 'Sentence Starters',
    subtitle: 'Completeness of Thought',
    domain: 'Basic Sentence Construction',
    badgeName: 'SENTENCE STARTER MEDAL',
    badgeIcon: '🏅',
    briefing: {
      welcome: "Great job finishing the Pretest, Relay Runners! 🏃 Time for your first mission — let's learn to spot a complete sentence!",
      objectives: [
        'Identify a complete thought',
        'Identify an incomplete thought (sentence fragment)',
        'Complete a sentence so its meaning is finished and clear',
      ],
      tips: [
        'A complete thought is a sentence that gives a finished message.',
        'Always ask: WHO or WHAT is it about? WHAT HAPPENED? Is the message finished?',
      ],
    },
    iDo: {
      coachMessage: 'Watch me first! A complete thought is a sentence that gives a finished message.',
      rules: [
        '1️⃣ WHO or WHAT is it about?',
        '2️⃣ WHAT HAPPENED?',
        '3️⃣ Is the message finished?',
      ],
      examples: [
        {
          type: 'complete',
          text: 'The runners lined up at the starting point.',
          analysis: [
            { label: 'WHO?', text: 'The runners', icon: '👥' },
            { label: 'WHAT HAPPENED?', text: 'They lined up', icon: '🏃' },
            { label: 'MORE INFO', text: 'at the starting point (tells us where)', icon: '📍' },
          ],
          explanation: 'This gives us a complete message — we know WHO and WHAT HAPPENED.',
        },
        {
          type: 'incomplete',
          text: 'Because the runner tripped near the finish line.',
          analysis: [
            { label: 'LOOK CLOSELY', text: 'This sentence leaves us hanging!', icon: '⚠️' },
            { label: 'FIX IT', text: 'The team lost the race because the runner tripped near the finish line.', icon: '💡' },
          ],
          question: 'Is this a complete thought?',
          explanation: 'No! It makes us expect more: "What happened because the runner tripped?" It is an incomplete thought.',
        },
      ],
      guideSummary: {
        title: "Coach Dash's 3-Step Check",
        steps: [
          '👉 1. WHO OR WHAT? — Who or what is the sentence about?',
          '👉 2. WHAT HAPPENED? — What did the subject do?',
          '👉 3. IS IT FINISHED? — Does it give a complete message?',
        ],
        formula: 'WHO/WHAT + ACTION + FINISHED MESSAGE = Complete Sentence',
      },
      quickCheck: {
        question: 'Which one is complete?',
        options: [
          'The fastest runner on our team.',
          'The fastest runner on our team won first place.',
          'Because the fastest runner on our team.',
        ],
        correct: 1,
        explanation: '✅ "The fastest runner on our team won first place." gives us a complete message!',
      },
    },
    weDo: {
      coachMessage: "Now it's your turn to practice with me! Discuss with your group before the Runner taps.",
      hints: [
        '💡 Hint 1: Look for a sentence that gives a finished message.',
        '💡 Hint 2: Ask — can this sentence stand by itself?',
        '💡 Hint 3: A sentence starting with "because" or "when" may need another part.',
      ],
      challenges: [
        {
          title: 'WE DO Challenge 1',
          prompt: 'Which sentence expresses a complete thought?',
          options: [
            'Because Ana was tired from the relay.',
            'Ana rested because she was tired from the relay.',
            'After Ana finished the relay.',
          ],
          correct: 1,
          explanation: '🎯 Excellent teamwork! "Ana rested because she was tired from the relay." gives a finished message.',
        },
        {
          title: 'WE DO Challenge 2',
          prompt: 'Which one is incomplete?',
          options: [
            'The team practiced every afternoon.',
            'The coach was proud.',
            'When the team practiced every afternoon.',
          ],
          correct: 2,
          explanation: '🎯 "When the team practiced every afternoon" makes us expect another part, like: "When the team practiced every afternoon, they improved their time."',
        },
        {
          title: 'WE DO Challenge 3 — Fix the Thought',
          prompt: '⚠️ "Maria before joining the relay team." — Something is missing. Can your group fix it?',
          options: [
            'Maria before joining the relay team.',
            'Maria trained hard before joining the relay team.',
            'Because Maria before joining the relay team.',
          ],
          correct: 1,
          explanation: 'The original sentence tells us WHO, but not WHAT HAPPENED. The fixed sentence gives a complete message!',
        },
      ],
    },
    youDo: {
      coachMessage: "You've practiced with me — now show what you've learned! Everyone thinks first; the Runner taps the group's final answer. No hints this time.",
      questions: [
        {
          p: 'Which sentence expresses a complete thought?',
          o: [
            'Because Kian runs every relay.',
            'Kian runs fast but is still tired.',
            'After Kian finished the race.',
            'While Kian was running.',
          ],
          c: 1,
          explanation: '"Kian runs fast but is still tired." tells who and what happened completely.',
        },
        {
          p: 'Which sentence expresses a complete thought?',
          o: [
            'Because the baton was dropped.',
            'After the baton fell.',
            'The baton fell into the mud.',
            'While the baton was rolling.',
          ],
          c: 2,
          explanation: '"The baton fell into the mud." is a finished thought.',
        },
        {
          p: 'Which sentence expresses a complete thought?',
          o: [
            'Because the coach is busy.',
            'After coaching the team.',
            'The coach is training the team.',
            'While the coach explains.',
          ],
          c: 2,
          explanation: '"The coach is training the team." expresses a full statement.',
        },
        {
          p: 'Which sentence is complete?',
          o: [
            'Because the girl loves running.',
            'The girl is running the relay.',
            'After running the relay.',
            'While the crowd was cheering.',
          ],
          c: 1,
          explanation: '"The girl is running the relay." has subject and verb and stands alone.',
        },
        {
          p: 'Which sentence expresses a complete thought?',
          o: [
            'Because Santino wakes up early.',
            'After waking up early.',
            "Santino wakes up early so he won't be late for practice.",
            'While getting ready for practice.',
          ],
          c: 2,
          explanation: '"Santino wakes up early so he won\'t be late for practice." gives a full explanation and finished message.',
        },
      ],
    },
  },
  session2: {
    phaseKey: 'session2',
    dayNumber: 2,
    missionNumber: 2,
    title: 'Word Order Relay',
    subtitle: 'Word Arrangement & Sentence Building',
    domain: 'Basic Sentence Construction',
    badgeName: 'WORD ORDER RUNNER',
    badgeIcon: '🥈',
    briefing: {
      welcome: "Welcome back, Relay Runners! Today we'll learn how to put words in the right order to build a clear sentence.",
      objectives: [
        '👉 Arrange — put words in the correct order',
        '👉 Read — check if the sentence sounds natural and right',
        '👉 Think — ask what the sentence is trying to say',
        '👉 Check — make sure the whole sentence makes sense',
      ],
      tips: [
        'Words need to be in the right places so a sentence makes sense.',
        'Remember: WHO/WHAT? + WHAT DID THEY DO? + MORE INFORMATION',
      ],
    },
    iDo: {
      coachMessage: 'Watch me arrange words into a clear order step-by-step!',
      rules: [
        'Step 1: Find WHO or WHAT (Subject)',
        'Step 2: Find the ACTION (Verb)',
        'Step 3: Add MORE INFORMATION (Where? When? How?)',
      ],
      examples: [
        {
          type: 'breakdown',
          text: 'track the running relay are quickly students the',
          analysis: [
            { label: 'STEP 1: WHO/WHAT?', text: 'the students (Subject)', icon: '👥' },
            { label: 'STEP 2: ACTION', text: 'are running (Verb)', icon: '🏃' },
            { label: 'STEP 3: MORE INFO', text: 'quickly on the track (How & Where)', icon: '📍' },
          ],
          explanation: 'Complete sentence: "The students are running on the track."',
        },
      ],
      guideSummary: {
        title: "Coach Dash's Word-Order Guide",
        steps: [
          '👉 WHO/WHAT? (Subject) — The students',
          '👉 WHAT DID THEY DO? (Verb/Action) — are running',
          '👉 MORE INFORMATION (Where? When? How?) — on the track',
        ],
        formula: 'WHO + ACTION + MORE INFORMATION',
      },
      quickCheck: {
        question: 'Which sentence is correct?',
        options: [
          'Quickly the students are running on the track.',
          'The track are running quickly in the students.',
          'The students are running quickly on the track.',
        ],
        correct: 2,
        explanation: '✅ "The students are running quickly on the track." follows natural Subject + Verb + Adverb + Preposition order!',
      },
    },
    weDo: {
      coachMessage: "Now we'll arrange sentences together! Remember: READ → THINK → ARRANGE → CHECK.",
      hints: [
        '💡 Hint 1: Who is doing the action?',
        '💡 Hint 2: Find the subject first.',
        '💡 Hint 3: After the subject, look for the action.',
        '💡 Hint 4: Read the sentence from beginning to end to hear if it sounds right.',
      ],
      challenges: [
        {
          title: 'WE DO Challenge 1 — Arrange the Words',
          prompt: 'Words: "school | to | goes | Jose | every relay day"',
          options: [
            'Jose goes to school every relay day.',
            'Every relay day Jose to school goes.',
            'Goes Jose to school every relay day.',
          ],
          correct: 0,
          explanation: '🎯 Correct: "Jose goes to school every relay day."',
        },
        {
          title: 'WE DO Challenge 2 — Arrange the Words',
          prompt: 'Words: "on the track | are practicing | the runners"',
          options: [
            'On the track the runners are practicing.',
            'The runners are practicing on the track.',
            'Are practicing the runners on the track.',
          ],
          correct: 1,
          explanation: '"The runners" tells us who. "are practicing" tells us what. "on the track" gives more information.',
        },
        {
          title: 'WE DO Challenge 3 — Fix the Sentence',
          prompt: '⚠️ "Baton he passes never."',
          options: [
            'He never passes the baton.',
            'He passes never the baton.',
            'Baton never he passes.',
          ],
          correct: 0,
          explanation: 'Excellent! "He never passes the baton." is arranged in a natural, clear order.',
        },
      ],
    },
    youDo: {
      coachMessage: "Everyone thinks first — the Runner arranges or taps the group's answer. No hints this time!",
      questions: [
        {
          p: 'Which sentence has the correct word order?',
          o: [
            'The finish line I ran toward.',
            'I ran toward the finish line.',
            'Toward I ran the finish line.',
          ],
          c: 1,
          explanation: 'Subject "I" + Verb "ran" + Prepositional phrase "toward the finish line".',
        },
        {
          p: 'Which sentence has the correct word order?',
          o: [
            'The dog barks outside.',
            'Outside the dog barks.',
            'Barks the dog outside.',
          ],
          c: 0,
          explanation: 'Subject (The dog) + Verb (barks) + Location (outside).',
        },
        {
          p: 'Arrange: pizza | I ate | the | leftover',
          o: [
            'I ate the leftover pizza.',
            'The leftover I ate pizza.',
            'Pizza I the leftover ate.',
          ],
          c: 0,
          explanation: '"I ate the leftover pizza." is the standard subject-verb-object arrangement.',
        },
        {
          p: 'Arrange: over | her | She cried | grades',
          o: [
            'She cried over her grades.',
            'Over grades she cried her.',
            'Her grades over she cried.',
          ],
          c: 0,
          explanation: '"She cried over her grades." is grammatically sound.',
        },
        {
          p: 'Which sentence has the correct word order?',
          o: [
            'In the track running the runners are.',
            'The runners are running in the track.',
            'Running the track are runners in.',
          ],
          c: 1,
          explanation: '"The runners are running in the track." has the correct syntax.',
        },
      ],
    },
  },
  session3: {
    phaseKey: 'session3',
    dayNumber: 3,
    missionNumber: 3,
    title: 'Noun & Verb Hunt',
    subtitle: 'Parts of Speech: Nouns & Verbs',
    domain: 'Parts of Speech Recognition',
    badgeName: 'NOUN & VERB HUNTER',
    badgeIcon: '🥉',
    briefing: {
      welcome: "Great progress, Relay Runners! Now let's switch events — today we hunt for nouns and verbs!",
      objectives: [
        '👉 NOUN — identify a person, place, animal, or thing',
        '👉 VERB — identify an action or state of being',
        'Every sentence needs at least one noun and one verb. Let\'s go hunting!',
      ],
      tips: [
        'Ask "who or what?" to find the NOUN.',
        'Ask "what is happening?" to find the VERB.',
      ],
    },
    iDo: {
      coachMessage: "Every sentence has building blocks. Let's inspect nouns and verbs!",
      rules: [
        'Ask "who or what?" to find the NOUN',
        'Ask "what is happening?" to find the VERB',
        'A sentence can have more than one noun — the doer and the receiver of the action',
      ],
      examples: [
        {
          type: 'parts',
          text: 'The fisherman caught three fish near the river.',
          analysis: [
            { label: 'NOUN (Person)', text: 'fisherman', icon: '👤' },
            { label: 'NOUN (Place)', text: 'river', icon: '🏞️' },
            { label: 'VERB (Action)', text: 'caught', icon: '🎣' },
          ],
          explanation: 'Fisherman and river name people/places. Caught tells the physical action.',
        },
        {
          type: 'parts',
          text: 'Our barangay celebrates its fiesta every May.',
          analysis: [
            { label: 'NOUN', text: 'barangay, fiesta', icon: '🏛️' },
            { label: 'VERB', text: 'celebrates', icon: '🎉' },
          ],
          explanation: 'Barangay and fiesta are nouns; celebrates is the verb action.',
        },
      ],
      guideSummary: {
        title: "Coach Dash's Noun & Verb Guide",
        steps: [
          '👉 Ask "who or what?" to find the NOUN.',
          '👉 Ask "what is happening?" to find the VERB.',
          '👉 A sentence can have more than one noun — the doer and the receiver.',
        ],
      },
      quickCheck: {
        question: "Find the noun: 'The teacher explained the lesson clearly.'",
        options: ['explained', 'clearly', 'lesson', 'the'],
        correct: 2,
        explanation: '"lesson" is a thing/concept, making it a Noun!',
      },
    },
    weDo: {
      coachMessage: "READ → THINK → DISCUSS → RUN. Let's find those nouns and verbs!",
      hints: [
        '💡 Hint 1: Ask "who or what" for nouns.',
        '💡 Hint 2: Ask "what is happening" for verbs.',
        '💡 Hint 3: Look for the word that shows action.',
      ],
      challenges: [
        {
          title: 'WE DO Challenge 1',
          prompt: "Find the verb: 'The fisherman caught three fish today.'",
          options: ['fisherman', 'caught', 'three', 'today'],
          correct: 1,
          explanation: '🎯 Correct! "Caught" tells us the action.',
        },
        {
          title: 'WE DO Challenge 2',
          prompt: "Find the noun: 'Our barangay celebrates its fiesta every May.'",
          options: ['celebrates', 'fiesta', 'every', 'its'],
          correct: 1,
          explanation: '🎯 Right! "Fiesta" names an event/thing, so it is a noun.',
        },
        {
          title: 'WE DO Challenge 3 — Fix It',
          prompt: '⚠️ "The relay quickly finished but forgot equipment." — A noun is missing! Who forgot the equipment?',
          options: [
            'The relay team quickly finished but forgot the equipment.',
            'Quickly finished but forgot the equipment.',
            'The relay quickly but forgot equipment.',
          ],
          correct: 0,
          explanation: 'Adding the noun "team" makes the sentence clear and complete!',
        },
      ],
    },
    youDo: {
      coachMessage: "No hints this time — show me what you've learned!",
      questions: [
        {
          p: "Identify the noun in the sentence: 'The children played in the barangay plaza.'",
          o: ['played', 'in', 'children', 'the'],
          c: 2,
          explanation: '"children" is a person (noun).',
        },
        {
          p: "Identify the noun in the sentence: 'The fisherman sailed across the calm river.'",
          o: ['sailed', 'across', 'calm', 'fisherman'],
          c: 3,
          explanation: '"fisherman" is a noun.',
        },
        {
          p: "Find the verb: 'Maria sings every afternoon.'",
          o: ['Maria', 'sings', 'every', 'afternoon'],
          c: 1,
          explanation: '"sings" is the action verb.',
        },
        {
          p: "Find the verb: 'The pupils wrote a poem.'",
          o: ['pupils', 'wrote', 'a', 'poem'],
          c: 1,
          explanation: '"wrote" is the action verb.',
        },
        {
          p: "Find the noun: 'The jeepney driver drove carefully through the flood.'",
          o: ['drove', 'carefully', 'driver', 'through'],
          c: 2,
          explanation: '"driver" is a noun.',
        },
      ],
    },
  },
  session4: {
    phaseKey: 'session4',
    dayNumber: 4,
    missionNumber: 4,
    title: 'Descriptor Dash & Grammar Champion',
    subtitle: 'Adjectives, Adverbs & Final Mixed Relay',
    domain: 'Parts of Speech Recognition + Combined Review',
    badgeName: 'GRAMMAR RELAY CHAMPION',
    badgeIcon: '🏆',
    briefing: {
      welcome: "This is it, Relay Runners! Today we learn adjectives and adverbs, then finish with the Grammar Champion Final Challenge!",
      objectives: [
        '👉 ADJECTIVE — describes a noun (what kind? how many?)',
        '👉 ADVERB — describes a verb (how, when, or where an action happens)',
        'Descriptor words make our sentences more colorful, precise, and clear!',
      ],
      tips: [
        'Adjectives describe nouns.',
        'Adverbs describe verbs (often ending in -ly).',
      ],
    },
    iDo: {
      coachMessage: "Watch how adjectives and adverbs enhance sentences!",
      rules: [
        '👉 ADJECTIVE describes a noun (tall tree, sweet mango)',
        '👉 ADVERB describes a verb (swayed gently, finished quickly)',
      ],
      examples: [
        {
          type: 'parts',
          text: 'The tall coconut tree swayed gently.',
          analysis: [
            { label: 'ADJECTIVE', text: 'tall (describes coconut tree)', icon: '🌴' },
            { label: 'ADVERB', text: 'gently (describes how it swayed)', icon: '💨' },
          ],
          explanation: '"tall" tells what kind of tree; "gently" tells how it swayed.',
        },
        {
          type: 'parts',
          text: 'They quickly finished the relay game.',
          analysis: [
            { label: 'ADVERB', text: 'quickly (tells HOW they finished)', icon: '⚡' },
          ],
          explanation: '"quickly" describes the verb "finished".',
        },
      ],
      guideSummary: {
        title: "Coach Dash's Descriptor Guide",
        steps: [
          '👉 Adjectives describe nouns — what kind or how many?',
          '👉 Adverbs describe verbs — how, when, or where?',
          '👉 Adverbs often end in -ly (carefully, quickly, happily).',
        ],
      },
      quickCheck: {
        question: "Find the adverb: 'The jeepney driver drove carefully through the flood.'",
        options: ['carefully', 'driver', 'drove', 'flood'],
        correct: 0,
        explanation: '"carefully" describes HOW the driver drove, so it is an Adverb!',
      },
    },
    weDo: {
      coachMessage: "Let's tackle these descriptor challenges together before the championship!",
      hints: [
        '💡 Hint 1: Adjectives describe nouns — what kind or how many?',
        '💡 Hint 2: Adverbs describe verbs — how, when, or where?',
        '💡 Hint 3: Adverbs often end in -ly.',
      ],
      challenges: [
        {
          title: 'WE DO Challenge 1',
          prompt: "Find the adjective: 'The sweet mangoes are ripe.'",
          options: ['mangoes', 'sweet', 'are', 'ripe'],
          correct: 1,
          explanation: '"sweet" tells what kind of mangoes!',
        },
        {
          title: 'WE DO Challenge 2',
          prompt: "Identify the part of speech: 'They QUICKLY finished the relay game.'",
          options: ['Noun', 'Verb', 'Adjective', 'Adverb'],
          correct: 3,
          explanation: '"QUICKLY" describes how they finished, so it is an Adverb.',
        },
        {
          title: 'WE DO Challenge 3 — Fix It',
          prompt: '⚠️ "The pupils is excited for the relay." — Something\'s off with the verb! Can your group fix it?',
          options: [
            'The pupils is excited for the relay.',
            'The pupils are excited for the relay.',
            'Pupils excited relay for the.',
          ],
          correct: 1,
          explanation: 'Plural subject "The pupils" requires plural verb "are"!',
        },
      ],
    },
    youDo: {
      coachMessage: "This is the final stretch! These questions mix everything you've learned — sentence completeness, word order, nouns, verbs, adjectives, and adverbs.",
      questions: [
        {
          p: 'Which is a complete, correct sentence?',
          o: [
            'The pupils is excited for the relay.',
            'The pupils are excited for the relay.',
            'Pupils excited relay for the.',
            'Excited the pupils are for relay.',
          ],
          c: 1,
          explanation: '"The pupils are excited for the relay." is grammatically complete and accurate.',
        },
        {
          p: 'Arrange the words: (the whole family / cooked / adobo / for)',
          o: [
            'Cooked adobo for the whole family.',
            'The whole family cooked adobo for.',
            'Adobo cooked for the whole family.',
            'She cooked adobo for the whole family.',
          ],
          c: 3,
          explanation: '"She cooked adobo for the whole family." has subject, verb, and prepositional phrase in order.',
        },
        {
          p: "What part of speech is the underlined word? 'The **BRIGHT** star shone at night.'",
          o: ['Noun', 'Verb', 'Adjective', 'Adverb'],
          c: 2,
          explanation: '"BRIGHT" describes the star (Adjective).',
        },
        {
          p: "Identify the part of speech: 'They **QUICKLY** finished the relay game.'",
          o: ['Noun', 'Verb', 'Adjective', 'Adverb'],
          c: 3,
          explanation: '"QUICKLY" is an Adverb describing how they finished.',
        },
        {
          p: 'Which sentence expresses a complete thought and correct word order?',
          o: [
            'Because the runners crossed the finish line.',
            'The runners crossed the finish line first.',
            'Finish line the runners crossed.',
            'Crossed the runners finish line the.',
          ],
          c: 1,
          explanation: '"The runners crossed the finish line first." is a finished, properly arranged sentence.',
        },
      ],
    },
  },
};

// DepEd Grading Scale Helper
export function getDepEdRating(percentage: number): { label: string; color: string; bg: string } {
  if (percentage >= 90) {
    return { label: 'Outstanding (90% – 100%)', color: '#0F5132', bg: '#D1E7DD' };
  } else if (percentage >= 85) {
    return { label: 'Very Satisfactory (85% – 89%)', color: '#167A51', bg: '#E4F7EC' };
  } else if (percentage >= 80) {
    return { label: 'Satisfactory (80% – 84%)', color: '#2D82B7', bg: '#EAF2FA' };
  } else if (percentage >= 75) {
    return { label: 'Fairly Satisfactory (75% – 79%)', color: '#8A5200', bg: '#FFF1BF' };
  } else {
    return { label: 'Did Not Meet Expectations (<75%)', color: '#842029', bg: '#FCE7E4' };
  }
}
