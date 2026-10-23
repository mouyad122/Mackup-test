import { prisma } from '@/lib/db';

export type CategoryNodeSeed = {
  slug: string;
  name: string;
  description?: string;
  imagePath?: string;
  templateCode?: string;
  children?: CategoryNodeSeed[];
};

export const rawaqDefaultTaxonomy: CategoryNodeSeed[] = [
  {
    slug: 'makeup',
    name: 'المكياج',
    description: 'مستحضرات التجميل والمكياج الأصلي لكافة الإطلالات',
    imagePath: '/images/categories/makeup.jpg',
    children: [
      {
        slug: 'makeup-lips',
        name: 'الشفاه',
        children: [
          { slug: 'lipstick', name: 'أحمر شفاه', templateCode: 'LIPSTICK' },
          { slug: 'lip-liner', name: 'محدد شفاه', templateCode: 'LIP_LINER' },
          { slug: 'lip-gloss', name: 'ملمع شفاه', templateCode: 'LIP_GLOSS' },
          { slug: 'lip-tint', name: 'تنت الشفاه', templateCode: 'LIP_TINT' },
          { slug: 'lip-care', name: 'عناية ومرطب الشفاه', templateCode: 'LIP_CARE' },
        ],
      },
      {
        slug: 'makeup-eyes',
        name: 'العيون',
        children: [
          { slug: 'mascara', name: 'ماسكارا', templateCode: 'MASCARA' },
          { slug: 'eyeliner', name: 'آيلاينر وكحل', templateCode: 'EYELINER' },
          { slug: 'eyeshadow', name: 'ظلال عيون', templateCode: 'EYESHADOW' },
          { slug: 'brow-pencil', name: 'قلم وتحديد الحواجب', templateCode: 'BROW_PENCIL' },
          { slug: 'brow-gel', name: 'جل وتثبيت الحواجب', templateCode: 'BROW_GEL' },
          { slug: 'false-lashes', name: 'رموش صناعية', templateCode: 'FALSE_LASHES' },
        ],
      },
      {
        slug: 'makeup-face',
        name: 'الوجه',
        children: [
          { slug: 'foundation', name: 'كريم أساس (فاونديشن)', templateCode: 'FOUNDATION' },
          { slug: 'concealer', name: 'كونسيلر وخافي عيوب', templateCode: 'CONCEALER' },
          { slug: 'blush', name: 'أحمر خدود (بلاشر)', templateCode: 'BLUSH' },
          { slug: 'face-powder', name: 'بودرة وجه', templateCode: 'POWDER' },
          { slug: 'highlighter', name: 'هايلايتر وإضاءة', templateCode: 'HIGHLIGHTER' },
          { slug: 'primer', name: 'برايمر مجهز للبشرة', templateCode: 'PRIMER' },
        ],
      },
    ],
  },
  {
    slug: 'fashion-abayas',
    name: 'الأزياء والعبايات',
    description: 'أرقى العبايات والأثواب التراثية الأردنية المطرزة والفساتين',
    imagePath: '/images/categories/fashion-abayas.jpg',
    children: [
      {
        slug: 'abayas',
        name: 'العبايات',
        children: [
          { slug: 'daily-abayas', name: 'عبايات يومية وعملية', templateCode: 'ABAYA' },
          { slug: 'formal-abayas', name: 'عبايات مناسبات وسهرة', templateCode: 'ABAYA' },
        ],
      },
      {
        slug: 'heritage-dresses',
        name: 'أثواب تراثية',
        children: [
          { slug: 'jordanian-embroidered-dress', name: 'ثوب أردني مطرز', templateCode: 'JORDANIAN_DRESS' },
        ],
      },
      {
        slug: 'dresses-sets',
        name: 'فساتين وأطقم',
        children: [
          { slug: 'dresses', name: 'فساتين سهرة ومناسبات', templateCode: 'DRESS' },
          { slug: 'womens-sets', name: 'أطقم نسائية فاخرة', templateCode: 'WOMENS_SET' },
        ],
      },
    ],
  },
  {
    slug: 'perfumes-fragrances',
    name: 'العطور والبخور',
    description: 'عطور شرقية ملكية، دهن عود، وعطور فرنسية نسائية ورجالية',
    imagePath: '/images/categories/perfumes.jpg',
    children: [
      {
        slug: 'oriental-oud',
        name: 'عطور شرقية وبخور',
        children: [
          { slug: 'oud-incense', name: 'دهن عود وبخور ومعمول', templateCode: 'PERFUME' },
          { slug: 'oriental-perfumes', name: 'عطور شرقية مركزة', templateCode: 'PERFUME' },
        ],
      },
      {
        slug: 'world-perfumes',
        name: 'عطور عالمية وبودي سبلاش',
        children: [
          { slug: 'women-edp', name: 'عطور نسائية (EDP)', templateCode: 'PERFUME' },
          { slug: 'men-edp', name: 'عطور رجالية (EDP)', templateCode: 'PERFUME' },
          { slug: 'body-splash', name: 'معطرات جسم وبودي سبلاش', templateCode: 'PERFUME' },
        ],
      },
    ],
  },
  {
    slug: 'skincare',
    name: 'العناية بالبشرة',
    description: 'حلول العناية المتكاملة بالبشرة وروتين النضارة والترطيب',
    imagePath: '/images/categories/skincare.jpg',
    children: [
      {
        slug: 'daily-care',
        name: 'عناية يومية أساسية',
        children: [
          { slug: 'face-cleanser', name: 'غسول ومنظف وجه', templateCode: 'CLEANSER' },
          { slug: 'moisturizer', name: 'كريم مرطب', templateCode: 'MOISTURIZER' },
          { slug: 'sunscreen', name: 'واقي شمس وحماية', templateCode: 'SUNSCREEN' },
        ],
      },
      {
        slug: 'targeted-treatments',
        name: 'علاجات وسيرومات مركزة',
        children: [
          { slug: 'serum', name: 'سيروم علاجي', templateCode: 'SERUM' },
          { slug: 'exfoliant', name: 'مقشرات وتجديد البشرة', templateCode: 'EXFOLIANT' },
          { slug: 'face-mask', name: 'أقنعة وماسكات الوجه', templateCode: 'FACE_MASK' },
          { slug: 'eye-cream', name: 'كريم محيط العين', templateCode: 'EYE_CREAM' },
        ],
      },
    ],
  },
  {
    slug: 'gifts-sets',
    name: 'الهدايا والبكجات',
    description: 'بوكسات وبكجات هدايا فاخرة جاهزة للمناسبات والإهداء',
    imagePath: '/images/categories/gifts.jpg',
    children: [
      {
        slug: 'gift-boxes',
        name: 'بكجات هدايا جاهزة',
        children: [
          { slug: 'luxury-gift-sets', name: 'هدايا وبكجات فاخرة', templateCode: 'GIFTS' },
        ],
      },
    ],
  },
  {
    slug: 'accessories',
    name: 'الإكسسوارات والحلي',
    description: 'أساور، خواتم، عقود فضة 925 وإكسسوارات راقية',
    imagePath: '/images/categories/accessories.jpg',
    children: [
      {
        slug: 'silver-jewelry',
        name: 'حلي ومجوهرات فضية',
        children: [
          { slug: 'jewelry-sets', name: 'إكسسوارات وأساور وحلي', templateCode: 'ACCESSORIES' },
        ],
      },
    ],
  },
];

/**
 * Ensures the 3-level hierarchical category taxonomy is installed in the database safely,
 * linking Level 3 specialized types to their default ProductTemplate without timing out.
 */
export async function ensureDefaultTaxonomyInstalled() {
  const rootCount = await prisma.category.count({ where: { parentId: null } }).catch(() => 0);
  if (rootCount >= rawaqDefaultTaxonomy.length) {
    return; // Already initialized
  }

  // Fetch all templates to link defaultTemplateId by code
  const templates = await prisma.productTemplate.findMany({ select: { id: true, code: true } }).catch(() => []);
  const templateMap = new Map(templates.map(t => [t.code, t.id]));

  for (const [rootOrder, rootNode] of rawaqDefaultTaxonomy.entries()) {
    const rootCat = await prisma.category.upsert({
      where: { slug: rootNode.slug },
      update: {
        name: rootNode.name,
        description: rootNode.description || null,
        imagePath: rootNode.imagePath || null,
        sortOrder: rootOrder,
        isVisible: true,
      },
      create: {
        slug: rootNode.slug,
        name: rootNode.name,
        description: rootNode.description || null,
        imagePath: rootNode.imagePath || null,
        sortOrder: rootOrder,
        isVisible: true,
      },
    });

    if (!rootNode.children) continue;

    for (const [subOrder, subNode] of rootNode.children.entries()) {
      const subCat = await prisma.category.upsert({
        where: { slug: subNode.slug },
        update: {
          name: subNode.name,
          parentId: rootCat.id,
          sortOrder: subOrder,
          isVisible: true,
        },
        create: {
          slug: subNode.slug,
          name: subNode.name,
          parentId: rootCat.id,
          sortOrder: subOrder,
          isVisible: true,
        },
      });

      if (!subNode.children) continue;

      for (const [leafOrder, leafNode] of subNode.children.entries()) {
        const defaultTemplateId = leafNode.templateCode ? templateMap.get(leafNode.templateCode) || null : null;
        await prisma.category.upsert({
          where: { slug: leafNode.slug },
          update: {
            name: leafNode.name,
            parentId: subCat.id,
            sortOrder: leafOrder,
            isVisible: true,
            defaultTemplateId,
          },
          create: {
            slug: leafNode.slug,
            name: leafNode.name,
            parentId: subCat.id,
            sortOrder: leafOrder,
            isVisible: true,
            defaultTemplateId,
          },
        });
      }
    }
  }
}
