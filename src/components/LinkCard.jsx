import React, { useState } from 'react';
import { ExternalLink, Pencil, Trash2, Copy, Check, Globe } from 'lucide-react';
import './LinkCard.css';

const LinkCard = ({ link, onEdit, onDelete }) => {
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);

  const getDomain = (rawUrl) => {
    try {
      const parsed = new URL(rawUrl);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return rawUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    }
  };

  const domain = getDomain(link.url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="link-card scale-in">
      <div className="link-card-header">
        <div className="link-favicon-wrapper">
          {!imgError ? (
            <img
              src={faviconUrl}
              alt=""
              className="link-favicon"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <Globe size={22} />
          )}
        </div>

        <div className="link-info">
          <div className="link-title-row">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-title"
              title={`Open ${link.title}`}
            >
              <span>{link.title}</span>
            </a>
            {link.category && (
              <span className="link-badge">{link.category}</span>
            )}
          </div>

          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-url-display"
            title={link.url}
          >
            <span>{domain}</span>
          </a>
        </div>
      </div>

      {link.description && (
        <p className="link-description">{link.description}</p>
      )}

      <div className="link-card-footer">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="link-open-btn"
          aria-label={`Open ${link.title} in new tab`}
        >
          <ExternalLink size={15} />
          <span>Open Website</span>
        </a>

        <div className="link-actions">
          <button
            type="button"
            className="btn-icon"
            onClick={handleCopy}
            title={copied ? 'Copied to clipboard!' : 'Copy URL'}
            aria-label="Copy URL"
          >
            {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => onEdit(link)}
            title="Edit link"
            aria-label="Edit link"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            className="btn-icon text-danger"
            onClick={() => onDelete(link.id)}
            title="Delete link"
            aria-label="Delete link"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkCard;
