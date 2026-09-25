import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomOut, ZoomIn, Maximize2, Maximize, Minimize, Download, FileIcon } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { getFileById, getFolderPath } from '../storage/fileStore';
import { getSubjectById } from '../storage/subjectStore';
import { getProgress, saveProgress } from '../storage/progressStore';
import { canPreview, getFileTypeInfo } from '../utils/fileTypes';
import ProgressBar from '../components/ProgressBar';
import './FileViewer.css';

// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const FileViewer = () => {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null); // track current render to cancel if needed

  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState('');

  // PDF state
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Non-PDF state
  const [textContent, setTextContent] = useState('');
  const [fileCategory, setFileCategory] = useState('');

  // Load the file and PDF document on mount
  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    const loadDocument = async () => {
      try {
        const fileData = await getFileById(fileId);
        if (!fileData) throw new Error('File not found');
        if (cancelled) return;
        setFile(fileData);

        // Build breadcrumbs
        const sub = await getSubjectById(fileData.subjectId);
        const path = await getFolderPath(fileData.folderId);
        const pathNames = path.map(p => p.name).join(' / ');
        setBreadcrumbs(`Semester 3 / ${sub?.name}${pathNames ? ' / ' + pathNames : ''} / ${fileData.name}`);

        const info = getFileTypeInfo(fileData.name);
        setFileCategory(info.category);

        objectUrl = URL.createObjectURL(fileData.data);
        setFileUrl(objectUrl);

        if (info.category === 'pdf') {
          // Load the PDF document
          const loadingTask = pdfjsLib.getDocument({ url: objectUrl, cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/', cMapPacked: true });
          const pdf = await loadingTask.promise;
          if (cancelled) return;
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);

          // Restore saved reading position
          const prog = await getProgress(fileId);
          if (prog && prog.currentPage >= 1 && prog.currentPage <= pdf.numPages) {
            setCurrentPage(prog.currentPage);
          } else {
            setCurrentPage(1);
            await saveProgress(fileId, 1, pdf.numPages);
          }
        } else if (['text', 'code'].includes(info.category) || fileData.type?.startsWith('text/')) {
          const text = await fileData.data.text();
          setTextContent(text);
          setTotalPages(1);
          setCurrentPage(1);
          await saveProgress(fileId, 1, 1);
        } else {
          setTotalPages(1);
          setCurrentPage(1);
          await saveProgress(fileId, 1, 1);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  // Render a PDF page with BOTH canvas (for visuals) and text layer (for copy-paste)
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      // Cancel any ongoing render
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      const page = await pdfDoc.getPage(currentPage);

      // getViewport automatically handles page rotation from the PDF metadata
      const viewport = page.getViewport({ scale });

      // --- Canvas rendering (the visual image) ---
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      // Use devicePixelRatio for crisp rendering on HiDPI screens
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';
      ctx.scale(dpr, dpr);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      await renderTask.promise;

      // --- Text layer (enables copy-paste / text selection) ---
      const textLayerDiv = textLayerRef.current;
      if (textLayerDiv) {
        // Clear previous text layer
        textLayerDiv.innerHTML = '';

        // Match text layer size to the canvas display size
        textLayerDiv.style.width = Math.floor(viewport.width) + 'px';
        textLayerDiv.style.height = Math.floor(viewport.height) + 'px';

        // CRITICAL: pdfjs 3.11 requires --scale-factor CSS variable
        // Without this, text spans won't be positioned correctly
        textLayerDiv.style.setProperty('--scale-factor', viewport.scale);

        const textContentData = await page.getTextContent();

        // Render the text layer and wait for it to finish
        const textRenderTask = pdfjsLib.renderTextLayer({
          textContentSource: textContentData,
          container: textLayerDiv,
          viewport: viewport,
          textDivs: [],
        });
        await textRenderTask.promise;
      }
    } catch (err) {
      // Ignore cancelled render errors
      if (err?.name !== 'RenderingCancelled') {
        console.error('Error rendering page', err);
      }
    }
  }, [pdfDoc, currentPage, scale]);

  // Re-render whenever pdfDoc, currentPage, or scale changes
  useEffect(() => {
    if (pdfDoc) {
      renderPage();
      saveProgress(fileId, currentPage, totalPages);
    }
  }, [pdfDoc, currentPage, scale, renderPage, fileId, totalPages]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return; // don't interfere with page input
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentPage(p => Math.min(p + 1, totalPages));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentPage(p => Math.max(p - 1, 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const handlePageInput = (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      setCurrentPage(val);
    }
  };

  const handleZoomIn = () => setScale(s => Math.min(s * 1.2, 4.0));
  const handleZoomOut = () => setScale(s => Math.max(s / 1.2, 0.5));

  const handleFitWidth = async () => {
    if (!pdfDoc || !containerRef.current) return;
    const page = await pdfDoc.getPage(currentPage);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const containerWidth = containerRef.current.clientWidth - 48; // padding
    const newScale = containerWidth / unscaledViewport.width;
    setScale(Math.min(Math.max(newScale, 0.5), 4.0));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  const handleDownload = () => {
    if (!fileUrl || !file) return;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) return <div className="viewer-loading">Loading document...</div>;
  if (error) return <div className="viewer-error text-danger">{error}</div>;

  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  return (
    <div className="viewer-container">
      {/* Thin progress bar at very top */}
      <div className="viewer-progress-bar">
        <ProgressBar value={progressPercent} showLabel={false} size="sm" />
      </div>

      {/* Toolbar */}
      <div className="viewer-toolbar">
        <div className="toolbar-left">
          <button className="btn-icon" onClick={() => navigate(-1)} title="Go Back">
            <ArrowLeft size={20} />
          </button>
          <div className="viewer-breadcrumbs truncate" title={breadcrumbs}>{breadcrumbs}</div>
        </div>

        {fileCategory === 'pdf' && (
          <div className="toolbar-center">
            <button className="btn-icon" onClick={handlePrev} disabled={currentPage <= 1}>
              <ChevronLeft size={20} />
            </button>
            <div className="page-input-container">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={handlePageInput}
                className="page-input"
              />
              <span>of {totalPages}</span>
            </div>
            <button className="btn-icon" onClick={handleNext} disabled={currentPage >= totalPages}>
              <ChevronRight size={20} />
            </button>
            <span className="page-percent">{progressPercent}%</span>
          </div>
        )}

        <div className="toolbar-right">
          {fileCategory === 'pdf' && (
            <div className="zoom-controls">
              <button className="btn-icon" onClick={handleZoomOut} title="Zoom Out">
                <ZoomOut size={18} />
              </button>
              <span className="zoom-text">{Math.round(scale * 100)}%</span>
              <button className="btn-icon" onClick={handleZoomIn} title="Zoom In">
                <ZoomIn size={18} />
              </button>
              <button className="btn-icon zoom-fit" onClick={handleFitWidth} title="Fit to Width">
                <Maximize2 size={18} />
              </button>
            </div>
          )}

          <button className="btn-icon" onClick={handleDownload} title="Download">
            <Download size={20} />
          </button>
          <button className="btn-icon" onClick={toggleFullscreen} title="Toggle Fullscreen">
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="viewer-content" ref={containerRef}>
        {fileCategory === 'pdf' ? (
          <div className="pdf-page-wrapper">
            <canvas ref={canvasRef} className="pdf-canvas" />
            {/* Text layer sits on top of canvas — makes text selectable and copyable */}
            <div ref={textLayerRef} className="textLayer" />
          </div>
        ) : fileCategory === 'image' ? (
          <img src={fileUrl} alt={file.name} className="image-viewer" />
        ) : (fileCategory === 'code' || fileCategory === 'text' || textContent) ? (
          <pre className="text-viewer"><code>{textContent}</code></pre>
        ) : (
          <div className="non-previewable card text-center">
            <FileIcon size={64} className="empty-icon" />
            <h2>{file.name}</h2>
            <p className="text-secondary">This file type cannot be previewed.</p>
            <button className="btn btn-primary" onClick={handleDownload} style={{ marginTop: '24px' }}>
              <Download size={18} /> Download to view
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileViewer;
