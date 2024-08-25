const argon2 = require('argon2');

async function testArgon2() {
  const password = '123'; // ใช้รหัสผ่านที่คุณกำลังทดสอบ
  const hashedPassword = await argon2.hash(password); // แฮชรหัสผ่าน
  console.log('Hashed Password:', hashedPassword);

  const isMatch = await argon2.verify(hashedPassword, password); // ตรวจสอบรหัสผ่าน
  console.log('Is password matching:', isMatch);
}

testArgon2().catch(err => console.error(err));

