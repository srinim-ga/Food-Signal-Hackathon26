# Food Signal PRD

## 1. Product Summary

Food Signal is an AI-powered personal nutrition assistant that helps people make safer dining decisions. The app ingests a user's health profile and a restaurant menu or food image, then identifies safe dishes, risky dishes, dishes to avoid, and practical questions to ask restaurant staff.

Source note: this PRD is based on the local idea document, `Hackathon'26 Idea.docx`. The linked SharePoint requirements document was not accessible from this environment because it requires sign-in, so any external requirements should be merged into this PRD once available.

## 2. Problem Statement

People with allergies, food sensitivities, chronic conditions, or dietary preferences often have to manually inspect menus and ask detailed questions before eating. This is time-consuming, error-prone, stressful, and especially difficult when menu descriptions are incomplete.

Food Signal reduces that burden by translating health constraints and menu content into clear, personalized dining guidance.

## 3. Target Users

- Diners with food allergies or intolerances.
- Diners with chronic conditions that influence food choices, such as GERD, diabetes, hypertension, kidney disease, or heart conditions.
- Diners with dietary restrictions or preferences, such as vegetarian, vegan, halal, kosher, low sodium, or low sugar.
- Caregivers making food decisions for children, older adults, or family members with health constraints.

## 4. Goals

- Help users quickly understand which dishes are likely safe, require caution, or should be avoided.
- Generate personalized questions users can ask a server or restaurant staff.
- Make menu analysis work from images, PDFs, pasted text, or manually entered menu items.
- Provide clear reasoning for each recommendation.
- Support a compelling hackathon demo by the final presentation day.

## 5. Non-Goals

- Diagnose medical conditions.
- Replace advice from a clinician, allergist, or dietitian.
- Guarantee food safety or cross-contamination status without restaurant confirmation.
- Build a full medical record system.
- Build a comprehensive clinical nutrition database during the hackathon MVP.

## 6. MVP Scope

The hackathon MVP should support the following end-to-end flow:

1. User creates or enters a health profile.
2. User uploads or enters a menu using one of the supported inputs.
3. System extracts dish names, descriptions, and likely ingredients.
4. System compares menu items against the user's health constraints.
5. System returns dishes grouped into Safe, Caution, and Avoid.
6. System generates concise, personalized questions to ask restaurant staff.

## 7. User Stories

- As a diner with allergies, I want to enter my allergens so that the app can flag dishes that may contain them.
- As a diner with a chronic condition, I want recommendations that account for foods that may aggravate my condition.
- As a diner at a restaurant, I want to take a photo of a menu so that I do not have to type each dish manually.
- As a diner, I want a short list of questions to ask the server so that I can verify unclear ingredients or preparation methods.
- As a hackathon judge, I want to see a clear before-and-after dining decision flow so that the value of the product is immediately visible.

## 8. Functional Requirements

### 8.1 Health Profile Ingestion

The app must allow users to provide:

- Allergies, such as peanuts, tree nuts, shellfish, dairy, eggs, soy, wheat, sesame, or fish.
- Dietary restrictions, such as vegan, vegetarian, halal, kosher, gluten-free, or lactose-free.
- Chronic conditions, such as GERD, diabetes, hypertension, kidney disease, or heart disease.
- Preferences, such as low sodium, low sugar, low fat, high protein, or spicy food avoidance.

For MVP, the profile can be entered through a simple form and stored locally for the session.

### 8.2 Menu Ingestion

The app should support at least one reliable ingestion path for the demo and may support multiple paths:

- Pasted menu text.
- Uploaded menu image.
- Uploaded PDF.
- Photo of a dish or menu section.

The app must extract or infer:

- Dish name.
- Dish description.
- Stated ingredients.
- Likely hidden ingredients when relevant, such as stocks, sauces, nuts, dairy, gluten, shellfish, or high-sodium components.

### 8.3 Ingredient Normalization

The app should normalize menu terms into comparable ingredient concepts.

Examples:

- "Pesto" may imply basil, oil, cheese, pine nuts, or walnuts.
- "Broth" may imply chicken, beef, vegetable, fish, or shellfish stock.
- "Aioli" may imply egg or dairy-like preparation concerns.
- "Tempura" may imply wheat batter and frying oil cross-contact risk.

### 8.4 Risk Scoring

Each dish must receive one of three user-facing classifications:

- Safe: no obvious conflict was found, based on available menu information.
- Caution: possible conflict, ambiguity, cross-contact concern, or preference mismatch.
- Avoid: clear conflict with a user allergy, chronic-condition constraint, preference, or dietary restriction.

The system should also provide a short explanation for each classification.

Risk factors should include:

- Explicit allergens.
- Likely hidden allergens.
- Cross-reactive or related ingredients.
- Condition conflicts, such as GERD with spicy or acidic foods, hypertension with high-sodium foods, or diabetes with high-sugar dishes.
- Dietary restriction conflicts.

### 8.5 Server Questions

For any dish classified as Caution or Avoid, the app should generate practical questions the user can ask restaurant staff.

Examples:

- "Does the pesto contain pine nuts, walnuts, or other tree nuts?"
- "Is the broth made with shellfish stock?"
- "Is this fried in shared oil with shellfish or wheat-battered items?"
- "Can the sauce be served on the side or made without dairy?"

### 8.6 Results Experience

The results screen should include:

- A clear grouping of Safe, Caution, and Avoid dishes.
- Dish-level reasoning.
- Confidence or uncertainty indicators when menu information is incomplete.
- Recommended server questions.
- A disclaimer that the output is informational and should be verified with restaurant staff and medical professionals when needed.

## 9. Safety, Trust, and Compliance Requirements

- The app must avoid claiming that a dish is guaranteed safe.
- The app must clearly state when a recommendation is based on incomplete menu information.
- The app must encourage users to verify allergy and cross-contact concerns with restaurant staff.
- The app must not provide medical diagnosis or treatment instructions.
- The app should treat health profile data as sensitive personal information.
- For the hackathon MVP, avoid storing health profile data beyond the active session unless explicitly required.
- If persistence is added, require user consent and document where data is stored.

## 10. AI Behavior Requirements

The AI should:

- Extract structured menu data from unstructured menu text or images.
- Identify explicit and likely ingredients.
- Compare ingredients against user constraints.
- Explain recommendations in plain language.
- Ask for clarification when the profile or menu is too ambiguous.
- Prefer cautious recommendations when allergy, cross-contact, or condition-related risks are uncertain.

The AI should not:

- Invent certainty about ingredients not listed on the menu.
- Minimize severe allergy risks.
- Present itself as a doctor or dietitian.
- Recommend ignoring professional medical advice.

## 11. Suggested MVP Architecture

### Frontend

- Health profile form.
- Menu input screen supporting pasted text and optionally image or PDF upload.
- Results screen with Safe, Caution, and Avoid sections.
- Server questions panel.

### Backend or App Logic

- Menu extraction pipeline.
- Ingredient normalization step.
- Risk scoring and classification step.
- Prompt orchestration for AI extraction and reasoning.
- Optional local/session storage for profile and analysis results.

### AI Pipeline

1. Convert menu input into text, using OCR for images or PDFs if needed.
2. Extract dish objects with name, description, ingredients, and inferred ingredients.
3. Compare dish objects against normalized health constraints.
4. Return structured JSON with classification, reasons, confidence, and questions.
5. Render the structured output in the UI.

## 12. Data Model Draft

### User Profile

```json
{
  "allergies": ["tree nuts", "shellfish"],
  "dietaryRestrictions": ["vegetarian"],
  "conditions": ["GERD"],
  "preferences": ["low sodium"]
}
```

### Menu Item Analysis

```json
{
  "dishName": "Pesto Pasta",
  "description": "Pasta with basil pesto and parmesan",
  "statedIngredients": ["pasta", "basil pesto", "parmesan"],
  "inferredIngredients": ["tree nuts", "dairy", "wheat"],
  "classification": "Caution",
  "reasons": [
    "Pesto may contain pine nuts or walnuts.",
    "Parmesan contains dairy."
  ],
  "questionsToAsk": [
    "Does the pesto contain pine nuts, walnuts, or other tree nuts?",
    "Can this be prepared without parmesan?"
  ],
  "confidence": "medium"
}
```

## 13. Demo Scenario

Recommended hackathon demo:

1. Create a sample user profile with tree nut allergy, shellfish allergy, GERD, and low-sodium preference.
2. Upload or paste a restaurant menu containing pesto pasta, shrimp ramen, grilled chicken salad, spicy wings, and vegetable risotto.
3. Show the app extracting dish and ingredient data.
4. Show Safe, Caution, and Avoid groupings.
5. Highlight generated server questions, such as pesto nut checks and shellfish broth checks.
6. Show how the user can make a faster, more confident dining decision.

## 14. Success Metrics

For the hackathon MVP:

- Menu analysis completes in under 30 seconds for a small menu.
- At least 80% of obvious allergen conflicts in demo menus are correctly flagged.
- Each Caution or Avoid result includes at least one useful explanation or server question.
- A first-time user can complete the profile-to-results flow without instruction.
- Judges can understand the value proposition within the first minute of the demo.

For a future product:

- Reduction in time required to evaluate a menu.
- User-reported confidence before ordering.
- Accuracy of allergen and restriction flags against verified restaurant data.
- Repeat usage by users with allergies, sensitivities, or chronic-condition constraints.

## 15. Hackathon Delivery Plan

### Day 1: Product, UX, and Data Contracts

- Finalize MVP flow.
- Create wireframes for profile input, menu input, and results.
- Define structured JSON outputs for menu extraction and risk analysis.
- Prepare sample user profiles and sample restaurant menus for repeatable testing.

### Day 2: Profile and Menu Input

- Build health profile form.
- Build pasted text menu ingestion.
- Add image or PDF ingestion if time allows.
- Add sample menu data for demos and fallback testing.

### Day 3: AI Extraction and Risk Classification

- Implement prompt or model call for dish extraction.
- Normalize ingredients and inferred ingredients.
- Validate extraction against sample menus.
- Implement Safe, Caution, and Avoid classification.
- Add basic rule checks for common allergies, dietary restrictions, chronic conditions, and preferences.

### Day 4: Results Experience and Demo Readiness

- Add reasoning and confidence output.
- Build results UI.
- Add server questions.
- Add disclaimers and uncertainty messaging.
- Run end-to-end checks on demo scenarios.
- Fix obvious extraction, classification, or presentation issues.

### Day 5: Final Presentation

- Present the end-to-end flow using a prepared persona and restaurant menu.
- Demonstrate menu extraction, Safe/Caution/Avoid grouping, reasoning, and server questions.
- Keep backup screenshots or a recorded walkthrough in case live services are unavailable.

### Post-Hackathon Work

- Improve UX copy and loading states.
- Add sample personas and menus.
- Add stronger image/PDF ingestion if it was not completed during the hackathon.
- Expand condition and preference rules with reviewed nutrition guidance.
- Add persistence only after privacy, consent, and data-retention decisions are made.

## 16. Open Questions

- Which requirements from the SharePoint document are mandatory for judging or submission?
- Should the MVP prioritize image/PDF menu upload, or is pasted text sufficient for the demo?
- Which AI platform, model, or cloud services should the team use?
- Will user profile data be stored, or should it remain session-only?
- Which medical and nutrition knowledge sources are acceptable for the hackathon?
- Should the app support multiple users or family profiles?
- Does the hackathon require a mobile-first experience, web app, Teams app, or other delivery surface?

## 17. Future Enhancements

- Barcode or packaged-food label scanning.
- Restaurant integration with verified ingredient and allergen data.
- Multi-profile support for families and groups.
- Saved favorite restaurants and dishes.
- Location-aware restaurant suggestions.
- Clinician or dietitian-reviewed recommendation rules.
- Multilingual menu translation and analysis.
- Voice mode for hands-free server question prompts.