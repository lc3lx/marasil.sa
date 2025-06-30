const cron = require('node-cron');
const Employee = require('../system/models/Employee');
const Salary = require('../system/models/Salary');
 const SalaryModification = require('../system/models/SalaryModification');

// Function to check if a full month has passed since hire date
const hasFullMonthPassed = (hireDate) => {
  const today = new Date();
  const hireMonth = hireDate.getMonth();
  const hireYear = hireDate.getFullYear();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Calculate months difference
  const monthsDiff = (currentYear - hireYear) * 12 + (currentMonth - hireMonth);
  return monthsDiff >= 1;
};

// Function to check if employee has been paid this month
const hasBeenPaidThisMonth = async (employeeId) => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const payment = await Salary.findOne({
    employeeId,
    salaryDate: { $gte: startOfMonth, $lte: endOfMonth }
  });
  
  return payment !== null;
};

// Function to process salaries
const processSalaries = async () => {
  try {
    console.log('Running salary processing job...');
    const today = new Date();
    const currentDay = today.getDate();
    
    // Find all employees
    const employees = await Employee.find({});
    
    for (const employee of employees) {
      const hireDate = new Date(employee.hireDate);
      const hireDay = hireDate.getDate();
      
      // Check if today matches their hire day
      if (currentDay === hireDay) {
        // Check if at least one full month has passed
        if (hasFullMonthPassed(hireDate)) {
          // Check if they haven't been paid this month
          const isPaid = await hasBeenPaidThisMonth(employee._id);
          
          if (!isPaid) {
            // Create new salary payment
         // 1. حساب بداية ونهاية الشهر الحالي
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

// 2. حساب مجموع البونصات
const bonuses = await SalaryModification.aggregate([
  {
    $match: {
      employee: employee._id,
      type: 'bonus',
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: '$amount' }
    }
  }
]);

// 3. حساب مجموع الخصومات
const deductions = await SalaryModification.aggregate([
  {
    $match: {
      employee: employee._id,
      type: 'deduction',
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: '$amount' }
    }
  }
]);

// 4. حساب الراتب النهائي
const bonusAmount = bonuses[0]?.total || 0;
const deductionAmount = deductions[0]?.total || 0;

const totalSalary = employee.salary + bonusAmount - deductionAmount;

// 5. حفظ سجل الراتب
await Salary.create({
  employeeId: employee._id,
  salaryDate: today,
  baseSalary: employee.salary,      // الراتب الأساسي
  bonus: bonusAmount,               // مجموع البونص
  deduction: deductionAmount,       // مجموع الخصومات
  totalSalary: totalSalary               // الراتب النهائي بعد التعديل
});

            
            console.log(`Salary processed for ${employee.fullName}`);
          } else {
            console.log(`${employee.fullName} has already been paid this month`);
          }
        } else {
          console.log(`${employee.fullName} hasn't completed a full month yet`);
        }
      }
    }
    
    console.log('Salary processing job completed');
  } catch (error) {
    console.error('Error processing salaries:', error);
  }
};

// Schedule job to run at midnight every day
const scheduleSalaryProcessing = () => {
  cron.schedule('0 0 * * *', processSalaries); // يشتغل يوميًا في نص الليل

    // cron.schedule('* * * * *', processSalaries); // يشتغل كل دقيقة
    console.log('Salary processing job scheduled to run at midnight daily');
};

module.exports = { scheduleSalaryProcessing, processSalaries };