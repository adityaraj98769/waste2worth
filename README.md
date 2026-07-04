# 👥 Team & Contributions

Waste2Worth is a collaborative project developed by **Team TrashToTreasure**.

## 👨‍💻 Team Members

### 🧑‍💼 Sarvesh Tripathi
**Role:** Team Lead | Full Stack Developer | System Architect

**Responsibilities**
- Designed the overall system architecture.
- Developed the frontend using React 18, TypeScript, and Vite.
- Built and integrated the Supabase backend.
- Designed the PostgreSQL database schema.
- Implemented Authentication, Organization Dashboard, Marketplace, Friends System, and Realtime features.
- Managed deployment using Vercel and overall project integration.

---

### 🤖 (Me)Adityaraj Dwivedi
**Role:** AI Integration & Sustainability Logic Engineer

**Responsibilities**
- Integrated **Google Gemini 2.5 Flash** for AI-powered waste recognition.
- Designed the complete AI inference pipeline from image capture to structured waste analysis.
- Developed the **Life Cycle Assessment (LCA) based Carbon Credit Algorithm**.
- Designed the carbon credit calculation formula using **IPCC emission factors**.
- Implemented the **streak multiplier logic** to reward consistent sustainable behaviour.
- Calculated environmental impact including estimated **CO₂ reduction** and waste disposal benefits.
- Contributed to technical documentation, AI workflow design, and sustainability methodology.

---

### 👨‍💻 Ravi Kumar
**Role:** Team Member

**Responsibilities**
- Assisted in project development.
- UI testing and feature validation.
- Bug reporting and debugging support.
- General project coordination and testing.

---

## 🤖 AI Layer

> **Designed & Integrated by Adityaraj Dwivedi**

Waste2Worth uses **Google Gemini 2.5 Flash (Multimodal Vision)** for intelligent waste analysis.

### AI Workflow

```
User captures image
        │
        ▼
Image sent to Gemini 2.5 Flash
        │
        ▼
AI identifies:
• Waste Item
• Material
• Category
• Confidence Score
• Disposal Instructions
• Upcycling Ideas
• Environmental Impact
        │
        ▼
Structured JSON returned
        │
        ▼
Stored in Supabase as Pending Scan
```

The AI layer performs:
- Waste identification
- Material classification
- Disposal recommendation
- Upcycling suggestions
- Environmental impact estimation
- Confidence score generation

The complete inference pipeline executes in under **3 seconds**, providing real-time user feedback.


## 🌿 Carbon Credit Algorithm

> **Designed by Adityaraj Dwivedi**

The Waste2Worth carbon credit engine is based on **Life Cycle Assessment (LCA)** methodology and **IPCC emission factors**.

Instead of assigning arbitrary reward points, the platform estimates the environmental benefit achieved through proper waste disposal.

### Formula

```
Carbon Credit (CC) =
(EmissionFactor_landfill − EmissionFactor_properDisposal)
× MaterialWeight
× ActivityMultiplier
```

Where:

- **EmissionFactor_landfill**
  Estimated CO₂ emitted if the waste is dumped into landfill.

- **EmissionFactor_properDisposal**
  Estimated CO₂ emitted after proper recycling, composting or safe disposal.

- **MaterialWeight**
  Estimated weight of the scanned waste item.

- **ActivityMultiplier**
  Reward multiplier based on user consistency.

This makes every reward scientifically grounded instead of being a random point system.

### Category Credit Values

| Category | Base Credits |
|-----------|-------------|
| Recyclable | 10 |
| Compostable | 8 |
| Upcyclable | 12 |
| Hazardous | 15 |
| Landfill | 2 |

## 🔥 Streak Multiplier System

> **Designed by Adityaraj Dwivedi**

Waste2Worth rewards consistent sustainable behaviour rather than one-time actions.

### Daily Streak Multipliers

| Consecutive Days | Multiplier |
|-----------------|-----------|
| 0–2 Days | 1.0× |
| 3–4 Days | 1.5× |
| 5–6 Days | 2.0× |
| 7+ Days | 3.0× |

### Credit Calculation

```
Final Credits =
Base Credits × Streak Multiplier
```

Example:

```
Plastic Bottle

Base Credits = 10

7-Day Streak = 3×

Final Credits = 30
```

This mechanism encourages users to develop long-term sustainable habits instead of scanning waste only once.
