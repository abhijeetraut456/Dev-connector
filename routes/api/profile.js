const express = require('express');
const router = express.Router();
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const normalize = require('normalize-url');
const checkObjectId = require('../../middleware/checkObjectId');
const axios = require('axios');
const config = require('config');

//route   GET api/profile/me
//desc    get current user profile
//access  private
router.get('/me', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate(
      'user',
      ['name', 'avatar']
    );
    if (!profile) {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//route   POST  api/profile
//desc    create or update
//access  Private
router.post(
  '/',
  [
    auth,
    [
      check('status', 'status is required').notEmpty(),
      check('skills', 'skills is required').notEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    //destructure the request
    const {
      website,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin,
      //spread the rest of filed we don't need to check
      ...rest
    } = req.body;

    const profileFields = {
      user: req.user.id,
      website:
        website && website !== ''
          ? normalize(website, { forceHttps: true })
          : '',
      skills: Array.isArray(skills)
        ? skills
        : skills.split(',').map((skill) => '' + skill.trim()),
      ...rest,
    };

    //build a social filed object
    const socialFields = { youtube, facebook, twitter, instagram, linkedin };

    //using normalize to ensure that valid url
    for (const [key, value] of Object.entries(socialFields)) {
      if (value && value.length > 0) {
        socialFields[key] = normalize(value, { forceHttps: true });
      }
    }
    //add to profileFields
    profileFields.social = socialFields;

    try {
      let profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

//route  GET api/profile
//desc   get all  profiles
//access Public
router.get('/', async (req, res) => {
  try {
    const profile = await Profile.find().populate('user', ['name', 'avatar']);
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('server Error');
  }
});

//route  GET api/profile
//desc   get profile by id
//access Public
router.get(
  '/user/:user_id',
  checkObjectId('user_id'),
  async ({ params: { user_id } }, res) => {
    try {
      const profile = await Profile.findOne({ user: user_id }).populate(
        'user',
        ['name', 'avatar']
      );
      if (!profile) {
        return res.status(400).json({ msg: 'Profile not found' });
      }
      return res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(400).send('Server Error');
    }
  }
);

//route  DELETE api/profile
//desc   delete user,profile & post
//access Private
router.delete('/', auth, async (req, res) => {
  try {
    //Remove profile
    //Remove user
    //Remove posts

    await Profile.findOneAndRemove({ user: req.user.id });
    await User.findOneAndRemove({ _id: req.user.id });

    res.json({ msg: 'user deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//route   PUT api/profile/experience
//desc    add profile experience
//access  Private
router.put(
  '/experience',
  [
    auth,
    [
      check('title', 'title is required').notEmpty(),
      check('company', 'company is required').notEmpty(),
      check('from', 'from is required ').notEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { title, company, location, from, to, description, current } =
      req.body;
    const newExp = { title, company, location, from, to, description, current };

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.experience.unshift(newExp);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

//route    DELETE  api/profile/experience/exp_id
//desc     delete experience from profile
//access   Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    const foundProfile = await Profile.findOne({ user: req.user.id });

    foundProfile.experience = foundProfile.experience.filter(
      (exp) => exp._id.toString() !== req.params.exp_id
    );

    await foundProfile.save();

    return res.status(200).json(foundProfile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//route   PUT api/profile/education
//desc    add education profile
//access  Private

router.put(
  '/education',
  [
    auth,
    [
      check('school', 'school is required').notEmpty(),
      check('degree', 'degree is required').notEmpty(),
      check('fieldofstudy', 'fieldofstudy is required').notEmpty(),
      check('from', 'form is required').notEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { school, degree, fieldofstudy, from, to, description, current } =
      req.body;
    const newEdu = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      description,
      current,
    };
    try {
      const profile = await Profile.findOne({ user: req.user.id });
      profile.education.unshift(newEdu);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

//route   DELETE  api/profile/education/:edu_id
//desc    delete education from profile
//access  Private
router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    const foundProfile = await Profile.findOne({ user: req.user.id });

    foundProfile.education = foundProfile.education.filter(
      (edu) => edu._id.toString() !== req.params.edu_id
    );

    await foundProfile.save();

    return res.status(200).json(foundProfile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//route  GET /github/:username
//desc   get user repos from github
//access Public
router.get('/github/:username', async (req, res) => {
  try {
    const uri = encodeURI(
      `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
    );

    const headers = {
      'user-agent': 'node.js',
      Authorization: `token ${config.get('githubToken')}`,
    };

    const githubResponse = await axios.get(uri, { headers });

    return res.json(githubResponse.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
