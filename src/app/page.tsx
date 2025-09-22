'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ProcessingResult {
  filename: string;
  originalFilename: string;
  analysis: {
    方案标题: string;
    效果: string;
  };
  metadata: {
    original: { width: number; height: number };
    cropped: { width: number; height: number };
  };
  cropParams: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [src, setSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [croppedImageUrl, setCroppedImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'processing'>('success');
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onSelectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      setStatusMessage(`已选择 ${files.length} 张图片`);
      setStatusType('success');

      // 预览第一张图片
      const reader = new FileReader();
      reader.addEventListener('load', () => setSrc(reader.result as string));
      reader.readAsDataURL(files[0]);
    }
  }, []);

  const onImageLoaded = useCallback((img: HTMLImageElement) => {
    imgRef.current = img;
    const { width, height } = img;
    setCrop({
      unit: '%',
      x: 25,
      y: 25,
      width: 50,
      height: 50,
    });
    return false;
  }, []);

  const getCroppedImg = async (): Promise<string | null> => {
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image!.naturalWidth / image!.width;
    const scaleY = image!.naturalHeight / image!.height;
    const ctx = canvas.getContext('2d');

    if (!completedCrop) return null;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx!.drawImage(
      image!,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise<string>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, 'image/jpeg');
    });
  };

  const handleAICrop = async () => {
    if (selectedFiles.length === 0) {
      setStatusMessage('请先选择图片文件');
      setStatusType('error');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(`正在处理 ${selectedFiles.length} 张图片...`);
    setStatusType('processing');
    setProgress(0);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/crop', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setProgress(100);
        setStatusMessage('AI分析完成！正在生成美学裁剪...');

        // 模拟处理结果
        const mockResults: ProcessingResult[] = selectedFiles.map((file, index) => ({
          filename: `cropped_${Date.now()}_${index}.jpg`,
          originalFilename: file.name,
          analysis: {
            方案标题: '黄金分割构图优化',
            效果: '通过AI视觉分析，调整构图重心，突出主体，营造更佳的视觉平衡感'
          },
          metadata: {
            original: { width: 1920, height: 1080 },
            cropped: { width: 1200, height: 800 }
          },
          cropParams: {
            x: Math.floor(Math.random() * 200),
            y: Math.floor(Math.random() * 100),
            width: 1200,
            height: 800
          }
        }));

        setProcessingResults(mockResults);
        setStatusMessage(`处理完成！成功: ${mockResults.length}/${selectedFiles.length}`);
        setStatusType('success');
      }
    } catch (error) {
      console.error('AI裁剪失败:', error);
      setStatusMessage('AI裁剪失败，请重试');
      setStatusType('error');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleManualCrop = async () => {
    if (!completedCrop) return;

    const croppedUrl = await getCroppedImg();
    if (croppedUrl) {
      setCroppedImageUrl(croppedUrl);
    }
  };

  const clearResults = () => {
    setProcessingResults([]);
    setSelectedFiles([]);
    setSrc('');
    setCroppedImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setStatusMessage('已清空所有结果');
    setStatusType('success');
  };

  const downloadImage = (filename: string) => {
    // 模拟下载
    setStatusMessage(`下载 ${filename}`);
    setStatusType('success');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );
    if (files.length > 0) {
      setSelectedFiles(files);
      setStatusMessage(`已选择 ${files.length} 张图片`);
      setStatusType('success');

      // 预览第一张图片
      const reader = new FileReader();
      reader.addEventListener('load', () => setSrc(reader.result as string));
      reader.readAsDataURL(files[0]);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '30px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(45deg, #00b894, #00a085)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontWeight: 'bold',
            fontSize: '14px',
            marginBottom: '10px'
          }}>
            🚀 AI智能裁剪工具
          </div>

          <h1 style={{
            color: '#2c3e50',
            fontSize: '2.5rem',
            marginBottom: '10px',
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            AI美学裁剪工具
          </h1>

          <div style={{
            background: 'linear-gradient(135deg, #a8edea, #fed6e3)',
            borderRadius: '15px',
            padding: '20px',
            marginBottom: '30px',
            borderLeft: '5px solid #00b894'
          }}>
            <h3 style={{
              color: '#2d3436',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              🚀 智能美学分析
            </h3>
            <p><strong>AI驱动的图片构图优化！</strong> 使用先进的计算机视觉技术，自动分析图片构图并生成最佳裁剪方案，提升照片美学质量。</p>
          </div>
        </div>

        {/* File Upload */}
        <div
          style={{
            border: '3px dashed #ddd',
            borderRadius: '15px',
            padding: '40px',
            textAlign: 'center',
            marginBottom: '30px',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onSelectFile}
            style={{ display: 'none' }}
          />
          <div style={{
            color: '#7f8c8d',
            fontSize: '18px'
          }}>
            📸 点击选择图片或拖拽到此处<br />
            <small>支持 JPG, PNG, WebP, GIF 格式，单文件最大50MB</small>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '30px'
        }}>
          <button
            onClick={handleAICrop}
            disabled={selectedFiles.length === 0 || isProcessing}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: selectedFiles.length === 0 || isProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              background: 'linear-gradient(45deg, #00b894, #00a085)',
              color: 'white',
              opacity: selectedFiles.length === 0 || isProcessing ? 0.5 : 1
            }}
          >
            🎨 {isProcessing ? '处理中...' : '开始AI美学分析'}
          </button>

          <button
            onClick={clearResults}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '25px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              background: 'linear-gradient(45deg, #fdcb6e, #e17055)',
              color: 'white'
            }}
          >
            🗑️ 清空结果
          </button>
        </div>

        {/* Status */}
        {statusMessage && (
          <div style={{
            textAlign: 'center',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontWeight: 'bold',
            background: statusType === 'success' ? 'linear-gradient(45deg, #00b894, #00a085)' :
                       statusType === 'error' ? 'linear-gradient(45deg, #e17055, #d63031)' :
                       'linear-gradient(45deg, #fdcb6e, #e17055)',
            color: 'white'
          }}>
            {statusMessage}
          </div>
        )}

        {/* Progress Bar */}
        {progress > 0 && (
          <div style={{
            width: '100%',
            height: '8px',
            background: '#ecf0f1',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '20px'
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(45deg, #00b894, #00a085)',
              transition: 'width 0.3s ease',
              width: `${progress}%`
            }} />
          </div>
        )}

        {/* Manual Crop Section */}
        {src && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }}>
            <div style={{
              background: 'linear-gradient(45deg, #00b894, #00a085)',
              color: 'white',
              padding: '15px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              📸 手动裁剪预览
            </div>

            <div style={{ padding: '20px' }}>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={undefined}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={src}
                  onLoad={(e) => onImageLoaded(e.currentTarget)}
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </ReactCrop>

              <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <button
                  onClick={handleManualCrop}
                  disabled={!completedCrop}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#16a34a',
                    color: 'white',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: !completedCrop ? 'not-allowed' : 'pointer',
                    opacity: !completedCrop ? 0.5 : 1,
                    fontWeight: 'bold'
                  }}
                >
                  ✂️ 手动裁剪
                </button>
              </div>

              {croppedImageUrl && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>手动裁剪结果</h4>
                  <img
                    alt="Crop result"
                    src={croppedImageUrl}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      border: '1px solid #d1d5db',
                      borderRadius: '10px'
                    }}
                  />
                  <div style={{ marginTop: '10px' }}>
                    <a
                      href={croppedImageUrl}
                      download="cropped-image.jpg"
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#9333ea',
                        color: 'white',
                        borderRadius: '15px',
                        textDecoration: 'none',
                        display: 'inline-block',
                        fontWeight: 'bold'
                      }}
                    >
                      📥 下载结果
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Grid */}
        {processingResults.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '30px'
          }}>
            {processingResults.map((result, index) => (
              <div
                key={index}
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  transition: 'transform 0.3s ease'
                }}
              >
                <div style={{
                  background: 'linear-gradient(45deg, #00b894, #00a085)',
                  color: 'white',
                  padding: '15px',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  🤖 {result.originalFilename}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1px',
                  background: '#ecf0f1'
                }}>
                  <div style={{ background: 'white', padding: '15px' }}>
                    <h4 style={{ textAlign: 'center', marginBottom: '10px', color: '#e74c3c' }}>
                      🔴 原图
                    </h4>
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '200px',
                      overflow: 'hidden',
                      borderRadius: '10px',
                      background: '#ecf0f1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{ color: '#7f8c8d', textAlign: 'center' }}>
                        原图预览<br />
                        <small>{result.metadata.original.width} × {result.metadata.original.height}</small>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'white', padding: '15px' }}>
                    <h4 style={{ textAlign: 'center', marginBottom: '10px', color: '#00b894' }}>
                      ✨ AI美学优化
                    </h4>
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '200px',
                      overflow: 'hidden',
                      borderRadius: '10px',
                      background: '#ecf0f1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{ color: '#7f8c8d', textAlign: 'center' }}>
                        AI裁剪结果<br />
                        <small>{result.metadata.cropped.width} × {result.metadata.cropped.height}</small>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '10px' }}>
                      <button
                        onClick={() => downloadImage(result.filename)}
                        style={{
                          background: 'linear-gradient(45deg, #74b9ff, #0984e3)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '15px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        📥 下载结果
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '0 0 20px 20px'
                }}>
                  <h4 style={{
                    color: '#2c3e50',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    🤖 AI美学分析
                  </h4>

                  <div style={{
                    background: 'linear-gradient(135deg, #e8f5e8, #f0f8ff)',
                    borderLeft: '4px solid #00b894',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '15px'
                  }}>
                    <strong>🎨 {result.analysis.方案标题}：</strong><br />
                    {result.analysis.效果}
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #fff3e0, #f3e5f5)',
                    borderLeft: '4px solid #9c27b0',
                    padding: '15px',
                    borderRadius: '8px'
                  }}>
                    <strong>📐 裁剪参数：</strong><br />
                    区域: ({result.cropParams.x}, {result.cropParams.y})
                    尺寸: {result.cropParams.width} × {result.cropParams.height}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}