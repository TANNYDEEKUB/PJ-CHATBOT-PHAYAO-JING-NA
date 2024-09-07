const Session = require('../models/sessionModel');
const axios = require('axios');
const fewShotExamples = require('../models/data_few_shot');  // Import few-shot examples
const nlp = require('compromise'); // Import NLP library

const HUGGING_FACE_API_URL = 'https://qv3plnmqhxq5ubwj.us-east-1.aws.endpoints.huggingface.cloud';
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

// ลิสต์คำหยาบภาษาไทย
const THAI_BAD_WORDS = ['อีสัตว์','ตาย','ไอสัตว์','สัตว์','สัส','อีสัส','ไอสัส','ควาย','อีควาย','ไอควาย','เหี้ย','อีเหี้ย','ไอเหี้ย','อีดอก','ตอแหล','อีตอแหล','ระยำ','ไอระยำ','อีระยำ','ชาติหมา','จัญไร','เฮงซวย','ชิบหาย','อีผี','โง่','อีโง่','ไอโง','ส้นตีน','หน้าโง่','ง่าว','แก่นแตด','เย็ดแม่','พ่อมึงตาย','แม่มึงตาย','ชาติชั่ว','สันดาน','เลว','อีช้างเย็ด','อีห่า','ไอห่า','ห่าราก','สัตว์นรก','ไอนรก','อีนรก','ชนชั้นต่ำ','โคตรพ่อมึง','โคตรแม่มึง','มึง','กู','หี','ควย','แตด','ฟัคยู','หน้าด้าน','เสือก','เสร่อ','สาระแน','วิปริต','หี','กระแดะ','อีเวร','ไอเวร','ดัดจริต'];

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

  generate_prompt(instruction, input = null, fewShot = null) {
    let prompt = input 
      ? this.template["prompt_input"].replace("{instruction}", instruction).replace("{input}", input)
      : this.template["prompt_no_input"].replace("{instruction}", instruction);

    // Add few-shot examples to the prompt
    if (fewShot && fewShot.length > 0) {
      const fewShotText = fewShot.map(example => `### Instruction:\n${example.instruction}\n\n### Input:\n${example.input}\n\n### Response:\n${example.response}\n`).join("\n");
      prompt = fewShotText + prompt;  // Combine few-shot examples with the main prompt
    }
    
    return prompt;
  }
}

// ฟังก์ชันเรียก Hugging Face API พร้อม few-shot
// ฟังก์ชันเรียก Hugging Face API พร้อม few-shot
const getBotResponse = async (instruction, input = null, config = {}, fewShot = []) => {
  const prompter = new Prompter();
  
  // ตรวจสอบว่ามี few-shot หรือไม่ ถ้าไม่มีให้สร้าง prompt ด้วย instruction เท่านั้น
  const prompt = fewShot.length > 0 
    ? prompter.generate_prompt(instruction, input, fewShot)
    : prompter.generate_prompt(instruction, input);  // ใช้เฉพาะ instruction

  const defaultConfig = {
    temperature: 0.3, 
    top_p: 0.75, 
    top_k: 50, 
    num_beams: 2, 
    repetition_penalty: 1.1, 
    no_repeat_ngram: 3, 
    max_new_tokens: 1000, 
  };

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


// ฟังก์ชันตรวจจับเจตนา
// ฟังก์ชันตรวจจับเจตนา (Intent Detection)
const getIntentFromMessage = (message) => {
  const lowerCaseMessage = message.toLowerCase();

  // เพิ่มการตรวจจับคำถามต่าง ๆ
  if (/ทำบอท|สร้างบอท|บอทตัวนี้ใครทำ/.test(lowerCaseMessage)) {
    return 'ใครเป็นคนสร้าง';
  } else if (/|/.test(lowerCaseMessage)) {
    return '';
  } else if (/|/.test(lowerCaseMessage)) {
    return '';
  } else if (/|/.test(lowerCaseMessage)) {
    return '';
  } else if (/'ตอบ'|ช่วยอะไรได้บ้าง/.test(lowerCaseMessage)) {
    return 'ตอบคำถาม';
  } else if (/'จบป เอก ศ'|จบปริญญาเอก อยากเป็น ศ /.test(lowerCaseMessage)) {
    return 'จบปเอกศ';
  } else if (/'จบป เอก ผศ'|จบปริญญาเอก อยากเป็น ผศ /.test(lowerCaseMessage)) {
    return 'จบปเอกผศ';
  } else if (/'จบป เอก รศ'|จบปริญญาเอก อยากเป็น รศ /.test(lowerCaseMessage)) {
    return 'จบปเอกรศ';  
  } else if (/^รศ( |$)|'รองศาสตราจารย์'/.test(lowerCaseMessage)) {
    return 'รศ';
  } else if (/^ผศ( |$)|'ผู้ช่วยศาสตราจารย์'/.test(lowerCaseMessage)) {
    return 'ผศ';
  } else if (/^ศ( |$)|'ศาสตราจารย์'/.test(lowerCaseMessage)) {
    return 'ศ';  
  } else {
    return null;  // หากไม่พบเจตนา
  }
};


// ฟังก์ชันจัดการข้อความที่คลุมเครือ
// ฟังก์ชันจัดการ fallback response
const handleAmbiguousMessage = (message, intent) => {
  if (intent === null) {
    return `ขออภัย เราไม่สามารถเข้าใจคำถามได้ โปรดระบุคำถามให้ชัดเจนหรือเพิ่มข้อมูลที่ต้องการถาม`;
  }
  return `ขออภัย เราไม่สามารถให้คำตอบได้ในขณะนี้ คุณอาจต้องการข้อมูลเพิ่มเติมเกี่ยวกับหัวข้อที่เกี่ยวข้องกับ ${intent}`;
};


// ฟังก์ชันบันทึกข้อความคลุมเครือ
const logAmbiguousMessage = (message) => {
  console.log(`Logging ambiguous message: ${message}`);
};

// ฟังก์ชันเรียนรู้จากความคิดเห็นของผู้ใช้
const collectUserFeedback = async (messageId, userId, feedback) => {
  try {
    await Feedback.create({ messageId, userId, feedback });
    console.log('User feedback saved successfully');
  } catch (error) {
    console.error('Error saving user feedback:', error);
  }
};

// ฟังก์ชันแนะนำข้อมูลเพิ่มเติม
const suggestAdditionalInfo = (intent) => {
  switch (intent) {
    case 'ใครเป็นคนสร้าง':
      return 'คุณอาจสนใจข้อมูลเพิ่มเติมเกี่ยวกับทีมพัฒนาของเรา';
    case 'รศ':
      return 'คุณสามารถสอบถามเพิ่มเติมเกี่ยวกับหัวข้อที่เกี่ยวข้องกับ รศ';
    default:
      return '';
  }
};

// ฟังก์ชันจัดการข้อความแชท
exports.handleChatMessage = async (req, res) => {
  const { message, sessionId, config } = req.body;
  const userId = req.user ? req.user._id : null;
  let botResponse;

  try {
    const filteredMessage = filterBadWords(message);
    const intent = getIntentFromMessage(filteredMessage);

    if (filteredMessage !== message) {
      botResponse = 'กรุณาอย่าใช้คำหยาบ';
    } else {
      // ถ้ามี intent และมีตัวอย่าง few-shot
      if (intent && fewShotExamples[intent]) {
        const fewShot = fewShotExamples[intent];
        botResponse = await getBotResponse(filteredMessage, null, config, fewShot);
      } else {
        // ถ้าไม่มี few-shot ให้บอทตอบเองโดยสร้าง prompt ตาม instruction ที่ได้รับ
        botResponse = await getBotResponse(filteredMessage, null, config);
        
        // ถ้า API ไม่สามารถตอบได้
        if (!botResponse) {
          botResponse = handleAmbiguousMessage(filteredMessage, intent);
        }
      }
    }

    // การจัดการ session และการตอบกลับของบอท
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



// ฟังก์ชันจัดการความคิดเห็นของผู้ใช้
exports.handleUserFeedback = async (req, res) => {
  const { messageId, feedback } = req.body;
  const userId = req.user ? req.user._id : null;

  if (userId && messageId && feedback) {
    await collectUserFeedback(messageId, userId, feedback);
    res.sendStatus(200);
  } else {
    res.status(400).json({ error: 'Missing required information' });
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
