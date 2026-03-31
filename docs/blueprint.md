# **App Name**: NeuroDO

## Core Features:

- Project Dashboard: A central dashboard providing a visual overview of the 5 key projects, displaying progress towards goals and current status. Implements a visual design for extreme chunking with no more than three items visible at any time. Mini-cards act as a navigation element to more detailed project screens.
- Energy Level Check-in: A daily check-in that assesses the user's energy levels and suggests suitable tasks based on the energy level. UI reflects this information, modifying itself appropriately to make the user feel understood.
- AI Mentor Integration: An integrated AI mentor using the Gemini API via Genkit, providing context-aware assistance, breaking down tasks, offering suggestions, and helping with decision-making, tailored to the user's neurodivergent needs and energy levels. AI serves as a tool to help make decisions with various filters implemented in the backend.
- Focus Timer: An adaptive Pomodoro timer that minimizes distractions, promotes deep work, and provides a calming visual aid, automatically adjusting work and break intervals according to the project and context.
- Idea Catcher: A quick capture feature for new ideas, allowing the user to jot down thoughts without derailing focus. Ideas will be classified by the tool to decide whether to store in a '2027' bucket.
- Metrics and Achievements: A system to track progress, celebrate milestones, and provide evidence of competence, helping to combat limiting beliefs and boost motivation.
- Evening Review: A nightly ritual screen with three simple prompts: "What did I accomplish today?" (celebration), "Where did I get stuck?" (identify blockers), and "Top 3 for tomorrow" (next day prep). Critical for ADHD closure and next-day readiness.
- Streak System: A visual counter showing consecutive days of progress, providing structured dopamine through visible momentum. Displays prominently on dashboard.
- Shiny Object Filter: Before saving any idea, a modal asks: "Does this solve a problem for one of the 5 projects?" and "Does this generate revenue by Dec 2026?". If no to both: automatically routes to 2027 bucket with confirmation message.
- Data Persistence: Data, tasks, energy levels, thoughts and chat data is stored to Firestore, the NoSQL cloud database for Firebase

## Style Guidelines:

- Primary color: Vivid Green (`#22C55E`), used to represent high energy, growth, and positive momentum, embodying a vibrant and motivating atmosphere.
- Background color: Deep, dark Blue-Gray (`#0A0A0F`), reduces visual fatigue and enhances focus by minimizing distractions, creating a concentrated environment.
- Accent color: Warm Amber (`#F59E0B`), strategically used for alerts and CTAs.
- Project colors: Each of the 5 projects has a distinct identity color: ENVOX: Solid Blue (`#3B82F6`) - stability, cash base; FARMÁCIAS: Purple (`#8B5CF6`) - innovation, growth; GERAÇÃO PJ: Orange (`#F97316`) - energy, communication; FELIZMENTE: Pink (`#EC4899`) - wellness, humanization; INFLUENCERS: Teal (`#14B8A6`) - connections, expansion.
- Energy indicator colors: Green (`#22C55E`) for high energy 7-10, Amber (`#F59E0B`) for medium 4-6, Red (`#EF4444`) for low 1-3, Gray (`#6B7280`) for maintenance mode 0.
- Body and headline font: 'Inter' (sans-serif) provides a modern, readable interface, suitable for on-screen reading.
- Maximum of 3 actionable items visible at any time to prevent decision paralysis.
- Generous spacing between elements (ADHD needs visual breathing room).
- Large touch targets for primary actions.
- Dark theme as default (non-negotiable for focus).
- A minimalist layout with high contrast facilitates visual processing and reduces cognitive load.
- Subtle animations and transitions provide dopamine feedback to celebrate milestones.
- Use custom iconography which is symbolic of both ADHD and entrepreneurship.