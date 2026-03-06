const User = require('../models/User');

exports.registerUser = async (req, res) => {
  try {
    const { 
      email, 
      amountPaid, 
      subCategory,
      teamMembers,
      passName,
      referralCode, 
      ...rest 
    } = req.body;

    // 👇 Validate amountPaid
    if (!amountPaid || amountPaid <= 0) {
      return res.status(400).json({ msg: 'Valid amountPaid is required' });
    }

    let user = await User.findOne({ email });

    if (user) {
      if (user.paymentStatus === 'paid') {
        return res.status(400).json({ msg: 'You have already registered and paid.' });
      }
      
      // Update existing user
      Object.assign(user, rest, { 
        amountPaid, 
        subCategory: subCategory || [],
        teamMembers: teamMembers || [],
        passName: passName || 'Pro Participation',
        referralCode, 
      });
      
      await user.save();
      return res.status(200).json(user);
    }

    // Generate registration ID
    const registrationId = `ZNX-${Date.now()}`;
    
    // Team leader set karo (first team member)
    const teamLeader = teamMembers && teamMembers.length > 0 ? teamMembers[0] : rest.fullName;

    user = new User({
      ...rest,
      email,
      amountPaid,
      subCategory: subCategory || [],
      teamMembers: teamMembers || [],
      teamLeader,
      passName: passName || 'Pro Participation',
      registrationId,
      paymentStatus: 'pending',
      referralCode, 
    });

    await user.save();
    res.status(201).json(user);

  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ msg: err.message });
  }
};