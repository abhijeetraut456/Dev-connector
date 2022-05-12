const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Post = require('../../models/Post');
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const checkObjectId = require('../../middleware/checkObjectId');

//route   POST api/post/
//desc    create a post
//access  Private
router.post(
  '/',
  auth,
  check('text', 'Text is required').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user.id).select('-password');

      const newPost = new Post({
        user: req.user.id,
        name: user.name,
        avatar: user.avatar,
        text: req.body.text,
      });

      const post = await newPost.save();
      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

//route  GET api/post
//desc   Get all post
//access Private

router.get('/', auth, async (req, res) => {
  try {
    const post = await Post.find().sort({ date: -1 });
    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//route   GET api/post/:id
//desc    Get post by id
//access  Private
router.get('/:id', auth, checkObjectId('id'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(400).json({ msg: 'post not found' });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//route  DELETE  api/post
//desc   Delete post by id
//access Private
router.delete('/:id', [auth, checkObjectId('id')], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(400).json({ msg: 'post not found' });
    }

    if (post.user.toString() !== req.user.id) {
      return res.status(400).json({ msg: 'User not authorization' });
    }

    await post.remove();

    res.json({ msg: 'post remove' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//route   PUT api/post
//desc    Like a post
//access  Private
router.put('/like/:id', auth, checkObjectId('id'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (post.likes.some((like) => like.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: 'Post already liked' });
    }
    post.likes.unshift({ user: req.user.id });

    await post.save();

    return res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//route  PUT api/post/unlike/:id
//desc   Unlike post
//access Private
router.put('/unlike/:id', auth, checkObjectId('id'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post.likes.some((like) => like.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: 'Post has not yet been like' });
    }

    //remove like
    post.likes = post.likes.filter(
      ({ user }) => user.toString() !== req.user.id
    );
    await post.save();
    return res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

//route   api/post/comment/:id
//desc    comment on a post
//access  Private
router.post(
  '/comment/:id',
  auth,
  checkObjectId('id'),
  check('text', 'Text is required').notEmpty(),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user.id);
      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      };

      post.comments.unshift(newComment);
      await post.save();
      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

//route   Delete api/post/:id/:comment_id
//desc    Delete comment
//access  Private
router.delete(
  '/comment/:id/:comment_id',
  auth,
  checkObjectId('id'),
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);

      //Pull out comment
      const comment = post.comments.find(
        (comment) => comment.id === req.params.comment_id
      );

      //Make sure user comments exits
      if (!comment) {
        return res.status(400).json({ msg: 'Comment does not exits' });
      }

      //check user
      if (comment.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not Authorized' });
      }

      post.comments = post.comments.filter(
        ({ id }) => id !== req.params.comment_id
      );
      await post.save();
      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router;
