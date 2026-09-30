import React, { useEffect, useState } from 'react';
import { FileText, Download, ImageOff, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Private bucket (see supabase/migrations/20260930_whatsapp_media.sql).
export const MEDIA_BUCKET = 'whatsapp-media';

const MB = 1024 * 1024;

// What WhatsApp accepts (Cloud API limits). Anything else goes as a document.
const MEDIA_RULES = {
  image: { types: ['image/jpeg', 'image/png'], max: 5 * MB, label: 'Photo' },
  video: { types: ['video/mp4', 'video/3gpp'], max: 16 * MB, label: 'Video' },
  audio: { types: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'], max: 16 * MB, label: 'Audio' },
  // 50 MB = storage upload limit. WhatsApp only accepts these document types.
  document: {
    types: [
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    max: 50 * MB,
    label: 'Document',
  },
};

export const MEDIA_ACCEPT = 'image/jpeg,image/png,video/mp4,video/3gpp,audio/aac,audio/mp4,audio/mpeg,audio/amr,audio/ogg,.mp3,.m4a,.aac,.amr,.ogg,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';

export const formatBytes = (n) => {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < MB) return `${Math.round(n / 1024)} KB`;
  return `${(n / MB).toFixed(1)} MB`;
};

/** Decides how a picked file will be sent, or explains why it can't be. */
export function classifyFile(file) {
  const mime = (file.type || '').split(';')[0].trim().toLowerCase();
  const kind = ['image', 'video', 'audio', 'document'].find(k => MEDIA_RULES[k].types.includes(mime));
  if (!kind) {
    const ext = (file.name.split('.').pop() || '').toUpperCase();
    return { error: `WhatsApp does not accept ${ext ? ext + ' ' : 'this type of '}files. Send JPG/PNG photos, MP4 videos, MP3/OGG/M4A audio, or PDF/Word/Excel/PowerPoint/TXT documents.` };
  }
  const rule = MEDIA_RULES[kind];
  if (file.size > rule.max) {
    return { error: `${rule.label} is too big (${formatBytes(file.size)}). WhatsApp allows up to ${formatBytes(rule.max)}.` };
  }
  if (file.size === 0) return { error: 'This file is empty.' };
  return { kind, mime: mime || 'application/octet-stream' };
}

/** Storage path for an outgoing file: outbound/<phone>/<time>-<safe name> */
export function outboundPath(phone, fileName) {
  const safe = (fileName || 'file').normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').slice(-80) || 'file';
  return `outbound/${String(phone).replace(/\D/g, '')}/${Date.now()}-${safe}`;
}

// Signed links last an hour; cache them so re-renders don't refetch.
const urlCache = new Map();
async function signedUrl(path) {
  const hit = urlCache.get(path);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw error || new Error('no url');
  urlCache.set(path, { url: data.signedUrl, expires: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

const MEDIA_MESSAGE_TYPES = ['image', 'video', 'audio', 'document', 'sticker'];
export const isMediaMessage = (msg) => MEDIA_MESSAGE_TYPES.includes(msg.message_type) || !!msg.media_path || !!msg.media_local_url;

/** Shows the photo / video / voice note / document inside a chat bubble. */
export function MessageMedia({ msg }) {
  const [url, setUrl] = useState(msg.media_local_url || null);
  const [failed, setFailed] = useState(false);
  const type = msg.message_type === 'sticker' ? 'image' : msg.message_type;
  // Inbound files are fetched from WhatsApp a few seconds after the message arrives.
  // If there is still no file after 2 minutes, it is not coming.
  const gaveUp = !msg.media_path && !msg.media_local_url && Date.now() - new Date(msg.created_at).getTime() > 2 * 60 * 1000;
  const downloadFailed = msg.media_mime === 'error/download-failed' || gaveUp;

  useEffect(() => {
    let alive = true;
    if (msg.media_local_url) { setUrl(msg.media_local_url); return undefined; }
    if (!msg.media_path) return undefined;
    signedUrl(msg.media_path)
      .then(u => { if (alive) setUrl(u); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [msg.media_path, msg.media_local_url]);

  if (downloadFailed || failed) {
    return (
      <div className="msg-media-missing">
        <ImageOff size={18} /> <span>{downloadFailed ? 'Media could not be downloaded — open WhatsApp on the phone to see it' : 'Could not load this file'}</span>
      </div>
    );
  }
  if (!url) {
    return (
      <div className="msg-media-missing">
        <Loader size={16} className="spinning" /> <span>Loading {type === 'document' ? 'document' : type}…</span>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="msg-media-link">
        <img src={url} alt={msg.message_body || 'Photo'} className={`msg-media-img ${msg.message_type === 'sticker' ? 'sticker' : ''}`} loading="lazy" />
      </a>
    );
  }
  if (type === 'video') {
    return <video src={url} controls preload="metadata" playsInline className="msg-media-video" />;
  }
  if (type === 'audio') {
    return <audio src={url} controls preload="metadata" className="msg-media-audio" />;
  }
  const name = msg.media_filename || 'Document';
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download={name} className="msg-media-doc">
      <FileText size={26} className="msg-media-doc-icon" />
      <span className="msg-media-doc-info">
        <span className="msg-media-doc-name">{name}</span>
        <span className="msg-media-doc-meta">{[formatBytes(msg.media_size), (msg.media_mime || '').split('/').pop()?.toUpperCase()].filter(Boolean).join(' · ')}</span>
      </span>
      <Download size={18} />
    </a>
  );
}
