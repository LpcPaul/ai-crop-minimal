import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // 简单的图片验证
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // 文件大小限制 (10MB)
    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // 这里可以集成真实的AI裁剪服务
    // 现在返回一个模拟的响应
    return NextResponse.json({
      success: true,
      message: 'Image processed successfully',
      croppedImageUrl: '/api/mock-cropped-image',
      metadata: {
        originalSize: imageFile.size,
        originalType: imageFile.type,
        originalName: imageFile.name,
      },
      processingTime: 1500,
    });
  } catch (error) {
    console.error('Crop API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'AI Crop API',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}
