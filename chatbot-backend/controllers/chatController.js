const Session = require('../models/sessionModel');
const axios = require('axios');
const fewShotExamples = require('../models/data_few_shot');
const nlp = require('compromise'); // Import NLP library

const HUGGING_FACE_API_URL = 'https://u4m3o7af91o4hucf.us-east-1.aws.endpoints.huggingface.cloud';
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

// ลิสต์คำหยาบภาษาไทย (สามารถเพิ่มคำได้ตามต้องการ)
const THAI_BAD_WORDS = ['อีสัตว์','ตาย','ไอสัตว์','สัตว์','สัส','อีสัส','ไอสัส','ควาย','อีควาย','ไอควาย','เหี้ย','อีเหี้ย','ไอเหี้ย','อีดอก','ตอแหล','อีตอแหล','ระยำ','ไอระยำ','อีระยำ','ชาติหมา','จัญไร','เฮงซวย','ชิบหาย','อีผี','โง่','อีโง่','ไอโง','มาร','ส้นตีน','หน้าโง่','ง่าว','แก่นแตด','เย็ดแม่','พ่อมึงตาย','แม่มึงตาย','ชาติชั่ว','สันดาน','เลว','อีช้างเย็ด','อีห่า','ไอห่า','ห่าราก','สัตว์นรก','ไอนรก','อีนรก','ชนชั้นต่ำ','โคตรพ่อมึง','โคตรแม่มึง','มึง','กู','หี','ควย','แตด','ฟัคยู','หน้าด้าน','เสือก','เสร่อ','สาระแน','วิปริต','หน้าหี','กระแดะ','เวร','อีเวร','ไอเวร','ดัดจริต']; // ลิสต์คำหยาบตามที่มีอยู่

// ฟังก์ชันกรองคำหยาบ
const filterBadWords = (text) => {
  let filteredText = text;
  THAI_BAD_WORDS.forEach((badWord) => {
    const regex = new RegExp(badWord, 'gi');
    filteredText = filteredText.replace(regex, '***');
  });
  return filteredText;
};

// Class Prompter สำหรับการจัดการ Prompt และ Template
class Prompter {
  constructor(template_name = "", verbose = false) {
    this._verbose = verbose;
    this.template = {
      "description": "Template used by Alpaca-LoRA.",
      "prompt_input": "Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.\n\n### Instruction:\n{instruction}\n\n### Input:\n{input}\n\n### Response:\n",
      "prompt_no_input": "Below is an instruction that describes a task. Write a response that appropriately completes the request.\n\n### Instruction:\n{instruction}\n\n### Response:\n",
      "response_split": "### Response:"
    };
  }

  generate_prompt(instruction, input = null) {
    return input 
      ? this.template["prompt_input"].replace("{instruction}", instruction).replace("{input}", input)
      : this.template["prompt_no_input"].replace("{instruction}", instruction);
  }
}

// ฟังก์ชันสำหรับการเรียก API ของ Hugging Face โดยรับพารามิเตอร์การตั้งค่า
const getBotResponse = async (instruction, input = null, config = {}) => {
  const prompter = new Prompter();
  const prompt = prompter.generate_prompt(instruction, input);

  // Default configuration (ปรับแต่งค่าตามความเหมาะสม)
  const defaultConfig = {
    temperature: 0.2, 
    top_p: 0.75, 
    top_k: 50, 
    num_beams: 2, 
    repetition_penalty: 1.3, 
    no_repeat_ngram: 3, 
    max_new_tokens: 2000, 
  };

  // Merge user config with default config
  const generationConfig = { ...defaultConfig, ...config };

  try {
    const response = await axios.post(
      HUGGING_FACE_API_URL,
      { inputs: prompt, parameters: generationConfig },
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.length > 0) {
      const generatedText = response.data[0].generated_text || null;
      if (generatedText) {
        const responseSplit = generatedText.split("### Response:");
        return responseSplit.length > 1 ? responseSplit[1].trim() : generatedText.trim();
      } else {
        return null;
      }
    } else {
      console.error("No response data from Hugging Face API");
      return null;
    }
  } catch (error) {
    console.error('Error calling Hugging Face API:', error.response ? error.response.data : error.message);
    return null;
  }
};

// ฟังก์ชันตรวจจับเจตนาของข้อความ
const getIntentFromMessage = (message) => {
  const lowerCaseMessage = message.toLowerCase();
  if (/ทำบอท|สร้างบอท|บอทถูกสร้าง|เว็ปไซทำโดย|สร้างเว็ปไซ|เว็ปถูกสร้าง|ทำai|สร้างai|aiถูกสร้าง/.test(lowerCaseMessage)) return 'ใครเป็นคนสร้าง';
  else if (/รศ/.test(lowerCaseMessage)) return 'รศ';
  else if (/ตอบ/.test(lowerCaseMessage)) return 'ตอบคำถาม';
  else if (/ผศ/.test(lowerCaseMessage)) return 'ผศ';
  else return null;
};

const formatBotResponse = (text) => {
  let formattedText = text.trim();

  // แทนที่ bullet points หรือรายการเลขที่จัดไม่ถูกต้อง
  formattedText = formattedText.replace(/•\s*/g, "<li>");
  formattedText = formattedText.replace(/(\d+)\.\s*/g, "<li>$1 ");

  // ห่อข้อความทั้งหมดด้วย <ol> เพื่อให้รายการมีเลขหน้าข้อ
  if (formattedText.includes("<li>")) {
    formattedText = `<ol>${formattedText}</ol>`;
  }

  // แทนที่ \n ด้วย <br> เพื่อให้เกิดการเว้นบรรทัดใหม่
  formattedText = formattedText.replace(/\\n/g, "<br>");

  // ถ้ามีการเว้นวรรค 2 ครั้งขึ้นไป จะเปลี่ยนเป็นแค่เว้นวรรค 1 ครั้ง
  formattedText = formattedText.replace(/\s\s+/g, ' ');

  return formattedText;
};




// ฟังก์ชันจัดการข้อความแชท
exports.handleChatMessage = async (req, res) => {
  const { message, sessionId, config } = req.body;
  const userId = req.user ? req.user._id : null;
  let botResponse;

  try {
    const filteredMessage = filterBadWords(message);

    if (filteredMessage !== message) {
      botResponse = 'กรุณาอย่าใช้คำหยาบ';
    } else {
      const intent = getIntentFromMessage(filteredMessage);
      if (intent && fewShotExamples[intent]) {
        botResponse = fewShotExamples[intent];
      } else {
        botResponse = await getBotResponse(filteredMessage, null, config);

        // ตรวจสอบหากบอทไม่สามารถหาคำตอบได้
        if (!botResponse) {
          botResponse = 'ขออภัย เราไม่มีข้อมูลในขณะนี้';
        } else {
          botResponse = formatBotResponse(botResponse);
        }
      }
    }

    if (userId) {
      let session;
      if (sessionId) {
        session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        session.messages.push({ sender: 'user', text: filteredMessage }, { sender: 'bot', text: botResponse });
        if (!session.userId) session.userId = userId;
      } else {
        session = new Session({ userId, messages: [{ sender: 'user', text: filteredMessage }, { sender: 'bot', text: botResponse }] });
      }
      await session.save();
      res.json({ reply: botResponse, sessionId: session._id });
    } else {
      res.json({ reply: botResponse });
    }
  } catch (error) {
    console.error("Error in handleChatMessage:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ฟังก์ชันดึงประวัติการสนทนา
exports.getChatHistory = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessions = await Session.find({ userId: req.user._id });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ฟังก์ชันลบเซสชันการสนทนา
exports.deleteChatSession = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await Session.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// ฟังก์ชันอัปเดตชื่อเซสชัน
exports.updateSessionName = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.body;
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.name = name || 'การสนทนาใหม่';
    await session.save();
    res.sendStatus(200);
  } catch (error) {
    console.error('Error updating session name:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
