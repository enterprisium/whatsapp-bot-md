const axios = require('axios');
const { bot } = require('../lib/');

const MONEYPRINTERTURBO_API_BASE = 'https://asontg-printer-fe.hf.space';

bot(
  {
    pattern: 'short ?(.*)',
    fromMe: true,
    desc: 'Generate a short video based on the provided topic',
    type: 'video',
  },
  async (message, match) => {
    const topic = match || message.reply_message.text;
    if (!topic) return await message.send('_Example: short <topic>_');

    try {
      // Step 1: Generate Script
      const scriptResponse = await axios.post(`${MONEYPRINTERTURBO_API_BASE}/v1/video/scripts`, {
        video_subject: topic,
        paragraph_number: 1,
      });

      const script = scriptResponse.data.data.script;
      if (!script) throw new Error('Failed to generate script');

      // Step 2: Generate Video
      const videoResponse = await axios.post(`${MONEYPRINTERTURBO_API_BASE}/v1/video/videos`, {
        video_subject: topic,
        video_script: script,
      });

      const taskId = videoResponse.data.data.task_id;
      if (!taskId) throw new Error('Failed to generate video task');

      // Step 3: Poll for Video Completion
      let videoUrl = null;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds

        const taskStatusResponse = await axios.get(`${MONEYPRINTERTURBO_API_BASE}/v1/video/tasks/${taskId}`);
        const taskData = taskStatusResponse.data.data;

        if (taskData.state === 'completed' && taskData.videos && taskData.videos.length > 0) {
          videoUrl = taskData.videos[0];
          break;
        }
      }

      if (!videoUrl) throw new Error('Video generation timed out');

      // Step 4: Send Video to WhatsApp
      await message.sendFromUrl(videoUrl, { quoted: message.data });
    } catch (error) {
      await message.send(`_Error: ${error.message}_`);
    }
  }
);
