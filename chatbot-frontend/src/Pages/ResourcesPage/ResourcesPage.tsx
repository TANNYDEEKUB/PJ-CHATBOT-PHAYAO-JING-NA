import { Navbar } from '../../Components/NavBar';
import './ResoutcesPage_styles.css';

const ResourcesPage = () => {
  return (
    <>
      <Navbar />
      <div className="resources-page pt-20 bg-primary text-jet">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">แหล่งที่มา</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="resource-item p-4 border border-jet rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-whitesmoke">
              <h3 className="text-xl font-semibold mb-2">แหล่งที่มา 1</h3>
              <p className="text-jet">รายละเอียดแหล่งที่มา 1...</p>
            </div>
            <div className="resource-item p-4 border border-jet rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-whitesmoke">
              <h3 className="text-xl font-semibold mb-2">แหล่งที่มา 2</h3>
              <p className="text-jet">รายละเอียดแหล่งที่มา 2...</p>
            </div>
            <div className="resource-item p-4 border border-jet rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-whitesmoke">
              <h3 className="text-xl font-semibold mb-2">แหล่งที่มา 3</h3>
              <p className="text-jet">รายละเอียดแหล่งที่มา 3...</p>
            </div>
            {/* เพิ่มแหล่งที่มาอื่น ๆ ได้ที่นี่ */}
          </div>
        </div>
      </div>
    </>
  );
};

export default ResourcesPage;
