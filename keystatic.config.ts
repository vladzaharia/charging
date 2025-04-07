import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'cloud',
  },
  cloud: {
    project: 'polaris/vladgg',
  },
  ui: {
    brand: {
      name: 'Vlad Zaharia',
    },
    navigation: {
      Content: ['jobs', 'projects', '---', 'tags'],
    },
  },
  collections: {
    jobs: collection({
      label: 'Jobs',
      slugField: 'position',
      path: 'src/content/jobs/*',
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        position: fields.slug({
          name: { label: 'Position', validation: { isRequired: true } },
          slug: { label: 'URL Slug', description: 'An SEO-friendly path for this job' },
        }),
        positionShort: fields.text({ label: 'Short Position', validation: { isRequired: false } }),
        company: fields.object({
          name: fields.text({ label: 'Company Name', validation: { isRequired: true } }),
          nameShort: fields.text({
            label: 'Short Company Name',
            validation: { isRequired: false },
          }),
          logo: fields.image({
            label: 'Company Logo',
            validation: { isRequired: false },
            directory: 'public/images/companies',
          }),
          url: fields.url({ label: 'Company URL', validation: { isRequired: false } }),
        }),
        location: fields.text({ label: 'Location', validation: { isRequired: true } }),
        dates: fields.object({
          from: fields.date({ label: 'Start Date', validation: { isRequired: true } }),
          to: fields.date({ label: 'End Date', validation: { isRequired: false } }),
        }),
        tags: fields.array(
          fields.relationship({
            label: 'Tags',
            description: 'A list of tags for this project',
            collection: 'tags',
          }),
          {
            label: 'Tags',
            itemLabel: (props) => props.value!,
          }
        ),
        content: fields.markdoc({
          label: 'Content',
        }),
      },
    }),
    projects: collection({
      label: 'Projects',
      slugField: 'title',
      path: 'src/content/projects/*',
      entryLayout: 'content',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({
          name: {
            label: 'Name',
            description: 'The name of the tag',
          },
          // Optional slug label overrides
          slug: {
            label: 'SEO-friendly slug',
            description: 'This will define the file/folder name for this entry',
          },
        }),
        githubUrl: fields.url({
          label: 'GitHub URL',
          validation: { isRequired: false },
        }),
        websiteUrl: fields.url({
          label: 'Website URL',
          validation: { isRequired: false },
        }),
        images: fields.array(
          fields.image({
            label: 'Image',
          }),
          { label: 'Project Images', validation: { length: { min: 0 } } }
        ),
        tags: fields.array(
          fields.relationship({
            label: 'Tags',
            description: 'A list of tags for this project',
            collection: 'tags',
          }),
          {
            label: 'Tags',
            itemLabel: (props) => props.value!,
          }
        ),
        content: fields.markdoc({
          label: 'Content',
        }),
      },
    }),
    tags: collection({
      label: 'Tags',
      slugField: 'name',
      path: 'src/content/tags/*',
      entryLayout: 'form',
      schema: {
        name: fields.slug({
          name: {
            label: 'Name',
            description: 'The name of the tag',
          },
          slug: {
            label: 'SEO-friendly slug',
            description: 'This will define the file/folder name for this entry',
          },
        }),
        type: fields.select({
          label: 'Type',
          options: [
            { label: 'Language', value: 'language' },
            { label: 'Framework', value: 'framework' },
            { label: 'Tool', value: 'tool' },
            { label: 'Other', value: 'other' },
          ],
          defaultValue: 'other',
        }),
        color: fields.text({ label: 'Color', validation: { isRequired: true } }),
        icon: fields.conditional(
          fields.select({
            label: 'Icon',
            description: 'Optional icon or image to use with tag',
            options: [
              { label: 'None', value: 'none' },
              { label: 'Icon class', value: 'icon' },
              { label: 'Image', value: 'image' },
            ],
            defaultValue: 'none',
          }),
          // Then, provide a schema for each condition
          {
            // "none" condition
            none: fields.empty(),
            // "icon" condition
            icon: fields.text({
              label: 'Icon class',
              validation: { length: { min: 1 }, isRequired: true },
            }),
            // "image" condition
            image: fields.image({
              label: 'Image',
              validation: { isRequired: true },
            }),
          }
        ),
      },
    }),
  },
});
