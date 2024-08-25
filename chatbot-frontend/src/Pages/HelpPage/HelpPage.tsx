import React from 'react';
import './HelpPage_styles.css';

const HelpPage: React.FC = () => {
  return (
    <div className="help-page pt-20 bg-primary text-jet">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">ช่วยเหลือ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="help-item p-6 border border-jet rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-whitesmoke">
            <h3 className="text-xl font-semibold mb-4">คำถามที่พบบ่อย</h3>
            <p className="text-jet">ค้นหาคำตอบสำหรับคำถามที่พบบ่อยเกี่ยวกับบริการของเรา...</p>
            <ul className="list-disc list-inside text-jet mt-4">
              <li>วิธีการใช้แชทบอท</li>
              <li>การจัดการบัญชีผู้ใช้</li>
              <li>วิธีการติดต่อฝ่ายสนับสนุน</li>
            </ul>
          </div>
          <div className="help-item p-6 border border-jet rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-whitesmoke">
            <h3 className="text-xl font-semibold mb-4">ติดต่อเรา</h3>
            <p className="text-jet">หากคุณต้องการความช่วยเหลือเพิ่มเติม โปรดติดต่อเราผ่านช่องทางต่อไปนี้:</p>
            <ul className="list-disc list-inside text-jet mt-4">
              <li>อีเมล: support@example.com</li>
              <li>โทรศัพท์: 012-345-6789</li>
              <li>ที่อยู่: 123 ถนนสายหลัก, กรุงเทพฯ, 10110</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
