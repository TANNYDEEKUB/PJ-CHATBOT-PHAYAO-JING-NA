const Session = require('../models/sessionModel');
const axios = require('axios');
const fewShotExamples = require('../models/data_few_shot');
const nlp = require('compromise'); // Import NLP library

const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/PisutDeekub/PJ-MINI-MODEL-FINAL';
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

// ลิสต์คำหยาบภาษาไทย (สามารถเพิ่มคำได้ตามต้องการ)
const THAI_BAD_WORDS = ['อีสัตว์','ไอสัตว์','สัตว์','สัส','อีสัส','ไอสัส','ควาย','อีควาย','ไอควาย','เหี้ย','อีเหี้ย','ไอเหี้ย','อีดอก','ตอแหล','อีตอแหล','ระยำ','ไอระยำ','อีระยำ','ชาติหมา','จัญไร','เฮงซวย','ชิบหาย','อีผี','โง่','อีโง่','ไอโง','มาร','ส้นตีน','หน้าโง่','ง่าว','แก่นแตด','เย็ดแม่','พ่อมึงตาย','แม่มึงตาย','ชาติชั่ว','สันดาน','เลว','อีช้างเย็ด','อีห่า','ไอห่า','ห่าราก','สัตว์นรก','ไอนรก','อีนรก','ชนชั้นต่ำ','โคตรพ่อมึง','โคตรแม่มึง','มึง','กู','หี','ควย','แตด','ฟัคยู','หน้าด้าน','เสือก','เสร่อ','สาระแน','วิปริต','หน้าหี','กระแดะ','เวร','อีเวร','ไอเวร','ดัดจริต']; // ตัวอย่างเช่นคำหยาบที่ใช้ในการกรอง

// ฟังก์ชันสำหรับกรองคำหยาบ
const filterBadWords = (text) => {
  let filteredText = text;
  THAI_BAD_WORDS.forEach((badWord) => {
    const regex = new RegExp(badWord, 'gi'); // ใช้ Regex เพื่อจับคำหยาบ
    filteredText = filteredText.replace(regex, '***'); // แทนที่คำหยาบด้วย ***
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
    if (this._verbose) {
      console.log(`Using prompt template: ${this.template['description']}`);
    }
  }

  generate_prompt(instruction, input = null, label = null) {
    let res;
    if (input) {
      res = this.template["prompt_input"].replace("{instruction}", instruction).replace("{input}", input);
    } else {
      res = this.template["prompt_no_input"].replace("{instruction}", instruction);
    }
    if (label) {
      res = `${res}${label}`;
    }
    if (this._verbose) {
      console.log(res);
    }
    return res;
  }

  get_response(output) {
    return output.split(this.template["response_split"])[1].trim();
  }
}

// ฟังก์ชันสำหรับการเรียก API ของ Hugging Face
const getBotResponse = async (instruction, input = null) => {
  const prompter = new Prompter(); // สร้าง Prompter instance
  const prompt = prompter.generate_prompt(instruction, input);

  try {
    const response = await axios.post(
      HUGGING_FACE_API_URL,
      { inputs: prompt },
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.length > 0) {
      const generatedText = response.data[0].generated_text || 'ขออภัย ไม่สามารถตอบกลับได้ในขณะนี้';

      // แยกเฉพาะส่วนของ ### Response:
      const responseSplit = generatedText.split("### Response:");
      if (responseSplit.length > 1) {
        return responseSplit[1].trim(); // ใช้เฉพาะส่วนที่อยู่หลัง ### Response:
      } else {
        return generatedText.trim(); // หากไม่มีการแยก ก็ส่งคืนข้อความทั้งหมด
      }
    } else {
      return 'ขออภัย ไม่สามารถตอบกลับได้ในขณะนี้';
    }
  } catch (error) {
    console.error('Error calling Hugging Face API:', error);
    return 'ขออภัย ไม่สามารถตอบกลับได้ในขณะนี้';
  }
};

// NLP function to enhance understanding of user input
const getIntentFromMessage = (message) => {
  const lowerCaseMessage = message.toLowerCase(); // แปลงข้อความเป็นตัวพิมพ์เล็ก

  // ใช้ Regex เพื่อตรวจจับคำหลัก
  if (/ศ/.test(lowerCaseMessage)) {
    return 'ศาสตราจารย์';
  } else if (/รศ/.test(lowerCaseMessage)) {
    return 'รองศาสตราจารย์';
  } else if (/สวัสดี/.test(lowerCaseMessage)) {
    return 'สวัสดี';
  } else if (/ผศ/.test(lowerCaseMessage)) {
    return 'ผู้ช่วยศาสตราจารย์';
  } else {
    return null; // กรณีที่ไม่มีการจับ intent ได้
  }
};


// Handle chat messages
exports.handleChatMessage = async (req, res) => {
  const { message, sessionId } = req.body;
  const userId = req.user ? req.user._id : null;

  let botResponse;

  try {
    // กรองคำหยาบจากข้อความของผู้ใช้
    const filteredMessage = filterBadWords(message);

    // ตรวจสอบว่ามีคำหยาบหรือไม่ หากมีให้ตอบกลับด้วยคำเตือน
    if (filteredMessage !== message) {
      botResponse = 'กรุณาอย่าใช้คำหยาบ';
    } else {
      // ใช้ NLP ในการตรวจจับเจตนา (intent)
      const intent = getIntentFromMessage(filteredMessage);
      console.log(`Intent detected: ${intent}`);

      if (intent && fewShotExamples[intent]) {
        botResponse = fewShotExamples[intent];
      } else {
        botResponse = await getBotResponse(filteredMessage); // ใช้ฟังก์ชัน getBotResponse ที่เตรียมไว้
      }
    }

    console.log(`User: ${filteredMessage}`);
    console.log(`Bot Response: ${botResponse}`);

    if (userId) {
      let session;

      if (sessionId) {
        session = await Session.findById(sessionId);

        if (!session) {
          return res.status(404).json({ error: 'Session not found' });
        }

        session.messages.push({ sender: 'user', text: filteredMessage }, { sender: 'bot', text: botResponse });

        // ถ้า session ยังไม่มี userId ให้เพิ่ม userId
        if (!session.userId) {
          session.userId = userId;
        }
      } else {
        // สร้างเซสชันใหม่
        session = new Session({
          userId,
          messages: [{ sender: 'user', text: filteredMessage }, { sender: 'bot', text: botResponse }],
        });
      }

      // บันทึกเซสชันทันทีหลังจากบอทตอบกลับ
      await session.save();

      // ส่งข้อมูลเซสชันใหม่กลับไปที่ไคลเอนต์เพื่ออัปเดต UI
      res.json({ reply: botResponse, sessionId: session._id });
    } else {
      // หากผู้ใช้ไม่ได้ล็อกอิน ให้ส่งคำตอบกลับไปแต่ไม่บันทึกเซสชัน
      res.json({ reply: botResponse });
    }
  } catch (error) {
    console.error("Error in handleChatMessage:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// Get chat history
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

// Delete chat session
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

// Update session name
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

    session.name = name || 'การสนทนาใหม่'; // กำหนดค่าชื่อ
    await session.save();
    res.sendStatus(200);
  } catch (error) {
    console.error('Error updating session name:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
