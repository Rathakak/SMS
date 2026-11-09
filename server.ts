import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAI() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // 1. Endpoint: Explain & Summarize Lesson (មុខងារពន្យល់សង្ខេបមេរៀន)
  app.post('/api/ai/summarize', async (req, res) => {
    try {
      const { subject, lessonTitle, contentOrTopic, focusMode } = req.body;
      if (!contentOrTopic && !lessonTitle) {
        res.status(400).json({ error: 'សូមបញ្ចូលចំណងជើងមេរៀន ឬខ្លឹមសារដែលត្រូវសង្ខេប។' });
        return;
      }

      const ai = getGenAI();
      const prompt = `អ្នកគឺជាគ្រូបង្រៀនថ្នាក់ទី៥ ដ៏ជំនាញ និងចិត្តល្អនៃក្រសួងអប់រំ យុវជន និងកីឡា (កម្ពុជា)។
សូមពន្យល់ និងសង្ខេបមេរៀនខាងក្រោមឱ្យសិស្សថ្នាក់ទី៥ ងាយយល់ ច្បាស់លាស់ និងងាយចាំ៖
- មុខវិជ្ជា: ${subject === 'math' ? 'គណិតវិទ្យា ថ្នាក់ទី៥' : 'ភាសាខ្មែរ ថ្នាក់ទី៥'}
- ចំណងជើងមេរៀន/ប្រធានបទ: ${lessonTitle || 'មេរៀនបន្ថែម'}
- ខ្លឹមសារ ឬចំណុចដែលសិស្សចង់ឱ្យពន្យល់: ${contentOrTopic || lessonTitle}
- កម្រិតនៃការពន្យល់: ${focusMode === 'simple' ? 'ពន្យល់ងាយៗ សម្រាប់សិស្សទើបចាប់ផ្ដើម' : focusMode === 'exam' ? 'សង្ខេបគន្លឹះសំខាន់ៗសម្រាប់ត្រៀមប្រឡង' : 'ពន្យល់លម្អិតជាជំហានៗ រួមទាំងឧទាហរណ៍'}

សូមឆ្លើយតបជាភាសាខ្មែរតាមទម្រង់ JSON ដែលបានកំណត់។`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              coreSummary: {
                type: Type.STRING,
                description: 'សេចក្ដីសង្ខេបខ្លឹមសារសំខាន់បំផុតនៃមេរៀន (២-៤ ល្បះច្បាស់ៗ)',
              },
              keyPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'ចំណុចគន្លឹះ ឬវិធាន/រូបមន្តសំខាន់ៗដែលសិស្សត្រូវចងចាំ (៣-៥ ចំណុច)',
              },
              stepByStepExplanation: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    stepTitle: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                  required: ['stepTitle', 'detail'],
                },
                description: 'ការពន្យល់ជាជំហានៗដើម្បីឱ្យសិស្សងាយអនុវត្តតាម',
              },
              examples: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    problem: { type: Type.STRING, description: 'លំហាត់គំរូ ឬឧទាហរណ៍ក្នុងល្បះ' },
                    solution: { type: Type.STRING, description: 'ដំណោះស្រាយ ឬការពន្យល់ចម្លើយ' },
                  },
                  required: ['problem', 'solution'],
                },
                description: 'ឧទាហរណ៍ ឬលំហាត់គំរូ ២-៣',
              },
              memoryTip: {
                type: Type.STRING,
                description: 'តិចនិកចងចាំខ្លីៗ (គន្លឹះចាំឆាប់នៃមេរៀននេះ)',
              },
            },
            required: ['coreSummary', 'keyPoints', 'stepByStepExplanation', 'examples', 'memoryTip'],
          },
        },
      });

      const data = JSON.parse(response.text || '{}');
      res.json(data);
    } catch (error) {
      console.error('Error in /api/ai/summarize:', error);
      res.status(500).json({
        error: 'មិនអាចបង្កើតការពន្យល់សង្ខេបបានទេនៅពេលនេះ។ សូមព្យាយាមម្ដងទៀត។',
      });
    }
  });

  // 2. Endpoint: Automatic Review Q&A & Flashcards Generator (រៀបចំសំណួរចម្លើយរំលឹកដោយស្វ័យប្រវត្តិ)
  app.post('/api/ai/generate-quiz', async (req, res) => {
    try {
      const { subject, lessonTitle, lessonSummary, difficulty, count = 5 } = req.body;
      const ai = getGenAI();

      const prompt = `អ្នកគឺជាគ្រូបង្រៀនថ្នាក់ទី៥ នៃក្រសួងអប់រំ យុវជន និងកីឡា (កម្ពុជា)។
សូមរៀបចំសំណួរ-ចម្លើយរំលឹកមេរៀនដោយស្វ័យប្រវត្តិ (ទាំងសំណួរជ្រើសរើសចម្លើយ MCQ និងប័ណ្ណរំលឹក Flashcards) សម្រាប់សិស្សថ្នាក់ទី៥៖
- មុខវិជ្ជា: ${subject === 'math' ? 'គណិតវិទ្យា ថ្នាក់ទី៥' : 'ភាសាខ្មែរ ថ្នាក់ទី៥'}
- មេរៀន: ${lessonTitle}
- ខ្លឹមសារសង្ខេប/បរិបទ: ${lessonSummary || lessonTitle}
- កម្រិតលំបាក: ${difficulty === 'easy' ? 'ងាយ (ពិនិត្យការចងចាំមូលដ្ឋាន)' : difficulty === 'hard' ? 'កម្រិតខ្ពស់ (លំហាត់អនុវត្ត និងគិតវិភាគ)' : 'មធ្យម (ស្របតាមសៀវភៅពុម្ពថ្នាក់ទី៥)'}
- ចំនួនសំណួរ: ${Math.min(Math.max(Number(count) || 5, 3), 10)} សំណួរ MCQ និង 4 ប័ណ្ណរំលឹក (Flashcards)។

សូមប្រាកដថាចម្លើយត្រឹមត្រូវតាមកម្មវិធីសិក្សាថ្នាក់ទី៥ ហើយមានការពន្យល់ច្បាស់លាស់។`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING, description: 'សំណួរ ឬចំណោទ' },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'ជម្រើសចម្លើយចំនួន ៤ (ក, ខ, គ, ឃ - មិនបាច់ដាក់អក្សរនាំមុខទេ)',
                    },
                    correctIndex: {
                      type: Type.INTEGER,
                      description: 'លេខសន្ទស្សន៍នៃចម្លើយត្រឹមត្រូវ (0, 1, 2, ឬ 3)',
                    },
                    explanation: {
                      type: Type.STRING,
                      description: 'ការពន្យល់លម្អិតថាតើហេតុអ្វីចម្លើយនេះត្រឹមត្រូវ និងរបៀបគណនា/វែកញែក',
                    },
                  },
                  required: ['question', 'options', 'correctIndex', 'explanation'],
                },
              },
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING, description: 'សំណួរខ្លី រូបមន្ត ឬពាក្យគន្លឹះនៅផ្នែកខាងមុខ' },
                    back: { type: Type.STRING, description: 'ចម្លើយ និយមន័យ ឬការពន្យល់ខ្លីនៅផ្នែកខាងក្រោយ' },
                    hint: { type: Type.STRING, description: 'តម្រុយខ្លីសម្រាប់ជួយរំលឹក' },
                  },
                  required: ['front', 'back', 'hint'],
                },
              },
            },
            required: ['questions', 'flashcards'],
          },
        },
      });

      const data = JSON.parse(response.text || '{}');
      res.json(data);
    } catch (error) {
      console.error('Error in /api/ai/generate-quiz:', error);
      res.status(500).json({
        error: 'មិនអាចបង្កើតសំណួររំលឹកដោយស្វ័យប្រវត្តិបានទេនៅពេលនេះ។ សូមព្យាយាមម្ដងទៀត។',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
