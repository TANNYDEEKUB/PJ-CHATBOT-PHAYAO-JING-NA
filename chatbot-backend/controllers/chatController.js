const Session = require('../models/sessionModel');
const axios = require('axios');
const fewShotExamples = require('../models/data_few_shot');  // Import few-shot examples
const nlp = require('compromise'); // Import NLP library

const HUGGING_FACE_API_URL = 'https://qfos2phtvw3cnejq.us-east-1.aws.endpoints.huggingface.cloud';
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

// ลิสต์คำหยาบภาษาไทย
const THAI_BAD_WORDS = ['อีสัตว์', 'ตาย', 'ไอสัตว์', 'สัตว์', 'สัส', 'อีสัส', 'ไอสัส', 'ควาย', 'อีควาย', 'ไอควาย', 'เหี้ย', 'อีเหี้ย', 'ไอเหี้ย', 'อีดอก', 'ตอแหล', 'อีตอแหล', 'ระยำ', 'ไอระยำ', 'อีระยำ', 'ชาติหมา', 'จัญไร', 'เฮงซวย', 'ชิบหาย', 'อีผี', 'โง่', 'อีโง่', 'ไอโง', 'ส้นตีน', 'หน้าโง่', 'ง่าว', 'แก่นแตด', 'เย็ดแม่', 'พ่อมึงตาย', 'แม่มึงตาย', 'ชาติชั่ว', 'สันดาน', 'เลว', 'อีช้างเย็ด', 'อีห่า', 'ไอห่า', 'ห่าราก', 'สัตว์นรก', 'ไอนรก', 'อีนรก', 'ชนชั้นต่ำ', 'โคตรพ่อมึง', 'โคตรแม่มึง', 'มึง', 'กู', 'หี', 'ควย', 'แตด', 'ฟัคยู', 'หน้าด้าน', 'เสือก', 'เสร่อ', 'สาระแน', 'วิปริต', 'กระแดะ', 'อีเวร', 'ไอเวร', 'ดัดจริต'];

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
      // ถ้าไม่มี input ให้ใช้ template นี้
      "prompt_input": "{instruction}\n\n### Response:\n",
      "prompt_no_input": "{instruction}\n\n### Response:\n",
      "response_split": "### Response:"
    };
  }

  generate_prompt(instruction, input = null, fewShot = []) {
    // ตรวจสอบว่ามี fewShot หรือไม่ ถ้ามีก็เพิ่มลงไป
    let fewShotText = "";
    if (fewShot.length > 0) {
      fewShotText = fewShot.map(example =>
        `### Instruction:\n${example.instruction}\n### Input:\n${example.input}\n### Response:\n${example.response}\n`
      ).join("\n");
    }

    // สร้าง prompt โดยลบ Input หากไม่มี
    let prompt = input
      ? this.template["prompt_input"].replace("{instruction}", instruction)
      : this.template["prompt_no_input"].replace("{instruction}", instruction);

    // รวม few-shot กับ prompt หลัก
    prompt = fewShotText + prompt;

    return prompt;
  }
}

// ฟังก์ชันเรียก Hugging Face API พร้อม few-shot
const getBotResponse = async (instruction, input = null, config = {}, fewShot = []) => {
  const prompter = new Prompter();

  // สร้าง prompt ที่มี few-shot
  const prompt = prompter.generate_prompt(instruction, input, fewShot);

  // สร้าง config สำหรับการ generate response
  const defaultConfig = {
    temperature: 0.7,
    top_p: 0.75,
    top_k: 50,
    num_beams: 2,
    repetition_penalty: 1.1,
    no_repeat_ngram: 5,
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
      let generatedText = response.data[0].generated_text || null;

      if (generatedText) {
        // ตัดข้อความที่ไม่ต้องการออก: Instruction, Input และลบเครื่องหมาย ***
        const responseSplit = generatedText.split("### Response:");
        let cleanedText = responseSplit.length > 1 ? responseSplit[1].trim() : generatedText.trim();

        // ลบเครื่องหมาย ***
        cleanedText = cleanedText.replace(/\*\*\*/g, '').trim();

        // ลบเครื่องหมาย ### ออกจากข้อความ
        cleanedText = cleanedText.replace(/###/g, '').trim();

        return cleanedText;
      } else {
        return null;
      }
    } else {
      console.error("ไม่มีข้อมูลตอบกลับจาก Hugging Face API");
      return null;
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเรียก Hugging Face API:', error.response ? error.response.data : error.message);
    return null;
  }
};

// ฟังก์ชันกรอง intent ที่ไม่ต้องการจากการตอบบอท
const cleanResponseText = (text) => {
  return text
    .replace(/\bคุณสมบัติเฉพาะตำแหน่ง\b/g, '')  // ลบ 'คุณสมบัติเฉพาะตำแหน่ง'
    .replace(/\bรศ\b/g, '')                         // ลบ 'รศ'
    .replace(/\bผศ\b/g, '')                         // ลบ 'ผศ'
    .replace(/\bศ\b/g, '')                          // ลบ 'ศ'
    .replace(/\bคณะกรรมการ\b/g, '')                // ลบ 'คณะกรรมการ'
    .replace(/###/g, '')                            // ลบ ###
    .trim();                                        // ลบช่องว่างส่วนเกิน
};

// ฟังก์ชันตรวจจับเจตนา (Intent Detection) ที่ปรับปรุง
const getIntentFromMessage = (message) => {
  const lowerCaseMessage = message.toLowerCase();

  // เพิ่มการตรวจจับคำถามต่าง ๆ
  if (/ทำ.*บอท|สร้าง.*บอท|บอท.*ทำ|สร้าง.*บอท/.test(lowerCaseMessage)) {
    return 'ใครเป็นคนสร้าง';
  } else if (/งาน.*รศ/.test(lowerCaseMessage)) {
    return 'รศ';
  } else if (/งาน.*ผศ/.test(lowerCaseMessage)) {
    return 'ผศ';
  } else if (/งาน.*(?:^|\s)ศ(?:$|\s)|งาน.*(?:^|\s)ศ(?:$|\s)/.test(lowerCaseMessage)) {
    return 'ศจ';
  } else if (/สวัส|บอท|ถาม/.test(lowerCaseMessage)) {
    return 'ทักทาย';
  } else if (/หลักเกณฑ์.*ทางวิชาการ/.test(lowerCaseMessage)) {
    return 'หลักเกณฑ์การแต่งตั้งตำแหน่งทางวิชาการ';
  } else if (/การยกเลิกประกาศ|ประกาศ.*กพอ/.test(lowerCaseMessage)) {
    return 'การยกเลิกประกาศเดิมและออกประกาศใหม่';
  } else if (/แต่งตั้งเฉพาะด้าน|หมวด.*เฉพาะด้าน/.test(lowerCaseMessage)) {
    return 'หมวดการแต่งตั้งเฉพาะด้าน';
  } else if (/แต่งตั้งโดยวิธีพิเศษ|การแต่งตั้ง.*พิเศษ/.test(lowerCaseMessage)) {
    return 'การแต่งตั้งโดยวิธีพิเศษ';
  } else if (/ประเภท.*ผลงาน|ชนิด.*ผลงาน/.test(lowerCaseMessage)) {
    return 'ประเภทของผลงานทางวิชาการที่ต้องการ';
  } else if (/การพิจารณาจริยธรรม|จริยธรรม.*ทางวิชาการ/.test(lowerCaseMessage)) {
    return 'การพิจารณาจริยธรรมและจรรยาบรรณทางวิชาการ';
  } else if (/การประเมินผลงานทางวิชาการ|ผลประเมิน.*ทางวิชาการ/.test(lowerCaseMessage)) {
    return 'วิธีการประเมินผลงานทางวิชาการ';
  } else if (/คุณสมบัติเฉพาะตำแหน่ง|คุณสมบัติ.*ตำแหน่ง/.test(lowerCaseMessage)) {
    return 'คุณสมบัติเฉพาะตำแหน่ง';
  } else if (/กรรมการ.*ตำแหน่ง|คณะ.*ตำแหน่ง|กรรมการ/.test(lowerCaseMessage)) {
    return 'คณะกรรมการ';
  } else if (/อธิบาย.*กพอ|กพอ/.test(lowerCaseMessage)) {
    return 'กพอ';
  } else if (/จบ.*ป\.?\s*เอก.*ตำแหน่ง|จบ.*ป\.?\s*เอก.*ขอ/.test(lowerCaseMessage)) {
    return 'เมื่อจบปริญญาเอก';
  } else if (/จบ.*ป\.?\s*โทร.*ตำแหน่ง|จบ.*ป\.?\s*โทร.*ขอ/.test(lowerCaseMessage)) {
    return 'เมื่อจบปริญญาโทร';
  } else if (/จบ.*ป\.?\s*ตรี.*ตำแหน่ง|จบ.*ป\.?\s*ตรี.*ขอ/.test(lowerCaseMessage)) {
    return 'เมื่อจบปริญญาตรี';
  } else {
    return null;
  }
};

// ฟังก์ชันจัดการข้อความแชท
exports.handleChatMessage = async (req, res) => {
  const { message, sessionId, config } = req.body;
  const userId = req.user ? req.user._id : null;
  let botResponse;

  try {
    const filteredMessage = filterBadWords(message);
    const intent = getIntentFromMessage(filteredMessage);  // รับ intent

    if (filteredMessage !== message) {
      botResponse = 'กรุณาอย่าใช้คำหยาบ';
    } else {
      // ถ้ามี intent และมีตัวอย่าง few-shot ให้เรียกใช้
      if (intent && fewShotExamples[intent]) {
        const fewShot = fewShotExamples[intent];
        botResponse = await getBotResponse(intent, null, config, fewShot); // ใช้ intent ในการสร้าง prompt
      } else {
        // ถ้าไม่มี few-shot ให้บอทตอบเองโดยสร้าง prompt ตาม instruction ที่ได้รับ
        botResponse = await getBotResponse(filteredMessage, null, config);

        // ตรวจสอบและลบ intent ที่ถูก return ไม่ให้แสดงในคำตอบ
        if (botResponse.includes(filteredMessage)) {
          botResponse = botResponse.replace(new RegExp(filteredMessage, 'g'), '').trim();
        }

        // กรองคำ intent ที่ไม่ต้องการ เช่น 'คุณสมบัติเฉพาะตำแหน่ง', 'คณะกรรมการ'
        botResponse = cleanResponseText(botResponse); // Clean unwanted terms
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
