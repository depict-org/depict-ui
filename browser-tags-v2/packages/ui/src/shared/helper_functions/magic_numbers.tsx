/*
 * Usually product templates are somewhat height-elastic depending on the content, i.e. if the title is longer we might up to two extra rows for this. That means that the placeholders almost never will reflect the size of the actual content when we do scroll restoration. This magic number specifies how many extra placeholders we should render everytime to compensate for this, since if the placeholders are in total shorter than the old scroll location the scroll restoration won't work.
 */
export const num_extra_placeholders = 30;
