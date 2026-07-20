/**
 * 豆包 (Doubao) provider adapter — text + image generation.
 *
 * 豆包 is ByteDance's AI assistant with built-in image generation.
 * This adapter supports both text chat and image generation via CDP.
 *
 * Image generation flow:
 *   1. Click the "图像生成" button to enter image mode
 *   2. Type prompt in the textarea
 *   3. Click send (or press Enter)
 *   4. Wait for image generation to complete
 *   5. Extract image URLs from the response
 *
 * Key differences from standard pipeline:
 *   - Has a separate "图像生成" image mode toggle
 *   - Uses Semi Design UI framework (textarea-based input)
 *   - Image response contains <img> elements in the message
 *   - Login required; session persists via Chrome profile
 */

const { COMMON_CN_QUOTA_PATTERNS, COMMON_DISMISS_PATTERNS } = require('../../providerFactory');

const RESPONSE_SELECTORS = [
    '[class*="message-content"]', '[class*="markdown"]',
    '[class*="answer"]', '[class*="response"]', '[class*="chat-message"]',
];

module.exports = {
    key: 'doubao',
    url: 'https://www.doubao.com',
    navPostDelay: 3000,
    authDomains: ['www.doubao.com/login', 'doubao.com/login'],
    quotaPatterns: [...COMMON_CN_QUOTA_PATTERNS],
    dismissPatterns: [...COMMON_DISMISS_PATTERNS],
    
    // Editor: Semi Design textarea
    editorSelectors: [
        'textarea[placeholder*="发消息"]', 'textarea.semi-input-textarea',
        'textarea', '[contenteditable="true"]', '[role="textbox"]',
    ],
    
    // Send button: Semi Design primary button
    sendSelectors: [
        'button.semi-button-primary', '[class*="send"]',
        'button[class*="primary"]',
    ],
    sendFallback: 'Enter',
    
    // Response area selectors
    responseSelectors: RESPONSE_SELECTORS,
    
    // Image generation support
    // Click "图像生成" button to switch to image mode
    imageModeSelectors: [
        'button:has-text("图像生成")',
        '[class*="image"] button',
        '[class*="generate"]',
    ],
    
    // After image generation, find <img> elements in the response
    imageResultSelectors: [
        '[class*="message-content"] img',
        '[class*="image-result"] img',
        '[class*="generated"] img',
        'img[class*="result"]',
    ],
    
    // Timing: image generation takes longer than text
    stabilityWindow: 15_000,
    minResponseLength: 5,
    imageGenerationTimeout: 120_000,  // 2 minutes for image gen
    
    // v1: 豆包 uses Semi Design UI
    // - Textarea with class semi-input-textarea
    // - Image mode via "图像生成" button toggle
    // - Responses rendered in message containers
};
