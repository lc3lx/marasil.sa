const mongoose = require('mongoose');
const Customer = require('./models/customerModel');

async function testAddressAPI() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marasil', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to database');

    // Find a customer
    const customer = await Customer.findOne();
    if (!customer) {
      console.log('No customer found');
      return;
    }

    console.log('Found customer:', customer._id);

    // Test adding an address with nationalAddress
    const testAddress = {
      alias: 'Test Address',
      location: 'Test Location',
      phone: '0501234567',
      city: 'Riyadh',
      country: 'Saudi Arabia',
      email: 'test@example.com',
      nationalAddress: 'Test National Address 12345'
    };

    console.log('Adding test address:', JSON.stringify(testAddress, null, 2));

    // Add address using the same logic as the controller
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customer._id,
      {
        $addToSet: { addresses: testAddress },
      },
      {
        new: true,
      }
    );

    console.log('Customer after adding address:');
    console.log('Addresses count:', updatedCustomer.addresses.length);
    console.log('Last address:', JSON.stringify(updatedCustomer.addresses[updatedCustomer.addresses.length - 1], null, 2));

    // Test updating the address
    const addedAddress = updatedCustomer.addresses[updatedCustomer.addresses.length - 1];
    const updateData = {
      nationalAddress: 'Updated National Address 67890',
      alias: 'Updated Test Address'
    };

    console.log('Updating address with:', JSON.stringify(updateData, null, 2));

    const updateResult = await Customer.findOneAndUpdate(
      { _id: customer._id, "addresses._id": addedAddress._id },
      {
        $set: {
          "addresses.$.nationalAddress": updateData.nationalAddress,
          "addresses.$.alias": updateData.alias
        }
      },
      { new: true }
    );

    if (updateResult) {
      const updatedAddress = updateResult.addresses.find(addr => addr._id.equals(addedAddress._id));
      console.log('Address after update:', JSON.stringify(updatedAddress, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

testAddressAPI();
