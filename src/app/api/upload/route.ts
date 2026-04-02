import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { MAX_IMAGE_SIZE_BYTES } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    let fileBuffer: Buffer = Buffer.from(await file.arrayBuffer()) as Buffer

    // Resize if too large
    if (fileBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
      const sharp = (await import('sharp')).default
      fileBuffer = await sharp(fileBuffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()
    }

    const service = createServiceSupabaseClient()
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${file.type.split('/')[1] ?? 'jpg'}`

    const { error: uploadError } = await service.storage
      .from('recipe-images')
      .upload(fileName, fileBuffer, {
        contentType: fileBuffer.byteLength > MAX_IMAGE_SIZE_BYTES ? 'image/jpeg' : file.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = service.storage
      .from('recipe-images')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error) {
    console.error('POST /api/upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
