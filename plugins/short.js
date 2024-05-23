const axios = require('axios');
const { bot } = require('../lib/');

const MONEYPRINTERTURBO_API_BASE = 'https://asontg-printer-be.hf.space/api/v1';

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
      const scriptResponse = await axios.post(`${MONEYPRINTERTURBO_API_BASE}/video/scripts`, {
        video_subject: topic,
        paragraph_number: 1,
      });

      const script = scriptResponse.data.data.script;
      if (!script) throw new Error('Failed to generate script');

      // Step 2: Generate Video Terms
      const termsResponse = await axios.post(`${MONEYPRINTERTURBO_API_BASE}/video/terms`, {
        video_subject: topic,
        video_script: script,
        amount: 1,
      });

      const videoTerms = termsResponse.data.data.video_terms;
      if (!videoTerms) throw new Error('Failed to generate video terms');

      // Step 3: Generate Video
      const videoResponse = await axios.post(`${MONEYPRINTERTURBO_API_BASE}/videos`, {
        video_subject: topic,
        video_script: script,
        video_terms: videoTerms,
        video_aspect: "9:16",
        video_concat_mode: "random",
        video_clip_duration: 5,
        video_count: 1,
        video_source: "pexels",
        video_materials: [
          {
            provider: "pexels",
            url: "",
            duration: 0
          }
        ],
        video_language: "",
        voice_name: "",
        voice_volume: 1,
        bgm_type: "random",
        bgm_file: "",
        bgm_volume: 0.2,
        subtitle_enabled: true,
        subtitle_position: "bottom",
        font_name: "STHeitiMedium.ttc",
        text_fore_color: "#FFFFFF",
        text_background_color: "transparent",
        font_size: 60,
        stroke_color: "#000000",
        stroke_width: 1.5,
        n_threads: 2,
        paragraph_number: 1
      });

      const taskId = videoResponse.data.data.task_id;
      if (!taskId) throw new Error('Failed to generate video task');

      // Step 4: Poll for Video Completion
      let videoUrl = null;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds

        const taskStatusResponse = await axios.get(`${MONEYPRINTERTURBO_API_BASE}/video/tasks/${taskId}`);
        const taskData = taskStatusResponse.data.data;

        if (taskData.state === 'completed' && taskData.videos && taskData.videos.length > 0) {
          videoUrl = taskData.videos[0];
          break;
        }
      }

      if (!videoUrl) throw new Error('Video generation timed out');

      // Step 5: Send Video to WhatsApp
      await message.sendFromUrl(videoUrl, { quoted: message.data });
    } catch (error) {
      await message.send(`_Error: ${error.message}_`);
    }
  }
);
