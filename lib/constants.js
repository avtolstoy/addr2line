const DW_TAG_map = {
  0x01: 'DW_TAG_array_type',
  0x02: 'DW_TAG_class_type',
  0x03: 'DW_TAG_entry_point',
  0x04: 'DW_TAG_enumeration_type',
  0x05: 'DW_TAG_formal_parameter',
  0x08: 'DW_TAG_imported_declaration',
  0x0a: 'DW_TAG_label',
  0x0b: 'DW_TAG_lexical_block',
  0x0d: 'DW_TAG_member',
  0x0f: 'DW_TAG_pointer_type',
  0x10: 'DW_TAG_reference_type',
  0x11: 'DW_TAG_compile_unit',
  0x12: 'DW_TAG_string_type',
  0x13: 'DW_TAG_structure_type',
  0x15: 'DW_TAG_subroutine_type',
  0x16: 'DW_TAG_typedef',
  0x17: 'DW_TAG_union_type',
  0x18: 'DW_TAG_unspecified_parameters',
  0x19: 'DW_TAG_variant',
  0x1a: 'DW_TAG_common_block',
  0x1b: 'DW_TAG_common_inclusion',
  0x1c: 'DW_TAG_inheritance',
  0x1d: 'DW_TAG_inlined_subroutine',
  0x1e: 'DW_TAG_module',
  0x1f: 'DW_TAG_ptr_to_member_type',
  0x20: 'DW_TAG_set_type',
  0x21: 'DW_TAG_subrange_type',
  0x22: 'DW_TAG_with_stmt',
  0x23: 'DW_TAG_access_declaration',
  0x24: 'DW_TAG_base_type',
  0x25: 'DW_TAG_catch_block',
  0x26: 'DW_TAG_const_type',
  0x27: 'DW_TAG_constant',
  0x28: 'DW_TAG_enumerator',
  0x29: 'DW_TAG_file_type',
  0x2a: 'DW_TAG_friend',
  0x2b: 'DW_TAG_namelist',
  0x2c: 'DW_TAG_namelist_item',
  0x2d: 'DW_TAG_packed_type',
  0x2e: 'DW_TAG_subprogram',
  0x2f: 'DW_TAG_template_type_parameter',
  0x30: 'DW_TAG_template_value_parameter',
  0x31: 'DW_TAG_thrown_type',
  0x32: 'DW_TAG_try_block',
  0x33: 'DW_TAG_variant_part',
  0x34: 'DW_TAG_variable',
  0x35: 'DW_TAG_volatile_type',
  0x36: 'DW_TAG_dwarf_procedure',
  0x37: 'DW_TAG_restrict_type',
  0x38: 'DW_TAG_interface_type',
  0x39: 'DW_TAG_namespace',
  0x3a: 'DW_TAG_imported_module',
  0x3b: 'DW_TAG_unspecified_type',
  0x3c: 'DW_TAG_partial_unit',
  0x3d: 'DW_TAG_imported_unit',
  0x3f: 'DW_TAG_condition',
  0x40: 'DW_TAG_shared_type',
  0x41: 'DW_TAG_type_unit',
  0x42: 'DW_TAG_rvalue_reference_type',
  0x43: 'DW_TAG_template_alias',
  0x4080: 'DW_TAG_lo_user',
  0xffff: 'DW_TAG_hi_user'
};

const DW_AT_map = {
  0x01: 'DW_AT_sibling', // reference
  0x02: 'DW_AT_location', // exprloc, loclistptr
  0x03: 'DW_AT_name', // string
  0x09: 'DW_AT_ordering', // constant
  0x0b: 'DW_AT_byte_size', // constant, exprloc, reference
  0x0c: 'DW_AT_bit_offset', // constant, exprloc, reference
  0x0d: 'DW_AT_bit_size', // constant, exprloc, reference
  0x10: 'DW_AT_stmt_list', // lineptr
  0x11: 'DW_AT_low_pc', // address
  0x12: 'DW_AT_high_pc', // address, constant
  0x13: 'DW_AT_language', // constant
  0x15: 'DW_AT_discr', // reference
  0x16: 'DW_AT_discr_value', // constant
  0x17: 'DW_AT_visibility', // constant
  0x18: 'DW_AT_import', // reference
  0x19: 'DW_AT_string_length', // exprloc, loclistptr
  0x1a: 'DW_AT_common_reference', // reference
  0x1b: 'DW_AT_comp_dir', // string
  0x1c: 'DW_AT_const_value', // block, constant, string
  0x1d: 'DW_AT_containing_type', // reference
  0x1e: 'DW_AT_default_value', // reference
  0x20: 'DW_AT_inline', // constant
  0x21: 'DW_AT_is_optional', // flag
  0x22: 'DW_AT_lower_bound', // constant, exprloc, reference
  0x25: 'DW_AT_producer', // string
  0x27: 'DW_AT_prototyped', // flag
  0x2a: 'DW_AT_return_addr', // exprloc, loclistptr
  0x2c: 'DW_AT_start_scope', // Constant, rangelistptr
  0x2e: 'DW_AT_bit_stride', // constant, exprloc, reference
  0x2f: 'DW_AT_upper_bound', // constant, exprloc, reference
  0x31: 'DW_AT_abstract_origin', // reference
  0x32: 'DW_AT_accessibility', // constant
  0x33: 'DW_AT_address_class', // constant
  0x34: 'DW_AT_artificial', // flag
  0x35: 'DW_AT_base_types', // reference
  0x36: 'DW_AT_calling_convention', // constant
  0x37: 'DW_AT_count', // constant, exprloc, reference
  0x38: 'DW_AT_data_member_location', // constant, exprloc, loclistptr
  0x39: 'DW_AT_decl_column', // constant
  0x3a: 'DW_AT_decl_file', // constant
  0x3b: 'DW_AT_decl_line', // constant
  0x3c: 'DW_AT_declaration', // flag
  0x3d: 'DW_AT_discr_list', // block
  0x3e: 'DW_AT_encoding', // constant
  0x3f: 'DW_AT_external', // flag
  0x40: 'DW_AT_frame_base', // exprloc, loclistptr
  0x41: 'DW_AT_friend', // reference
  0x42: 'DW_AT_identifier_case', // constant
  0x43: 'DW_AT_macro_info', // macptr
  0x44: 'DW_AT_namelist_item', // reference
  0x45: 'DW_AT_priority', // reference
  0x46: 'DW_AT_segment', // exprloc, loclistptr
  0x47: 'DW_AT_specification', // reference
  0x48: 'DW_AT_static_link', // exprloc, loclistptr
  0x49: 'DW_AT_type', // reference
  0x4a: 'DW_AT_use_location', // exprloc, loclistptr
  0x4b: 'DW_AT_variable_parameter', // flag
  0x4c: 'DW_AT_virtuality', // constant
  0x4d: 'DW_AT_vtable_elem_location', // exprloc, loclistptr
  0x4e: 'DW_AT_allocated', // constant, exprloc, reference
  0x4f: 'DW_AT_associated', // constant, exprloc, reference
  0x50: 'DW_AT_data_location', // exprloc
  0x51: 'DW_AT_byte_stride', // constant, exprloc, reference
  0x52: 'DW_AT_entry_pc', // address
  0x53: 'DW_AT_use_UTF8', // flag
  0x54: 'DW_AT_extension', // reference
  0x55: 'DW_AT_ranges', // rangelistptr
  0x56: 'DW_AT_trampoline', // address, flag, reference, string
  0x57: 'DW_AT_call_column', // constant
  0x58: 'DW_AT_call_file', // constant
  0x59: 'DW_AT_call_line', // constant
  0x5a: 'DW_AT_description', // string
  0x5b: 'DW_AT_binary_scale', // constant
  0x5c: 'DW_AT_decimal_scale', // constant
  0x5d: 'DW_AT_small', // reference
  0x5e: 'DW_AT_decimal_sign', // constant
  0x5f: 'DW_AT_digit_count', // constant
  0x60: 'DW_AT_picture_string', // string
  0x61: 'DW_AT_mutable', // flag
  0x62: 'DW_AT_threads_scaled', // flag
  0x63: 'DW_AT_explicit', // flag
  0x64: 'DW_AT_object_pointer', // reference
  0x65: 'DW_AT_endianity', // constant
  0x66: 'DW_AT_elemental', // flag
  0x67: 'DW_AT_pure', // flag
  0x68: 'DW_AT_recursive', // flag
  0x69: 'DW_AT_signature', // reference
  0x6a: 'DW_AT_main_subprogram', // flag
  0x6b: 'DW_AT_data_bit_offset', // constant
  0x6c: 'DW_AT_const_expr', // flag
  0x6d: 'DW_AT_enum_class', // flag
  0x6e: 'DW_AT_linkage_name', // string
  0x2000: 'DW_AT_lo_user', // ---
  0x3fff: 'DW_AT_hi_user', // ---
};

const DW_FORM_map = {
  0x01: 'DW_FORM_addr', // address
  0x03: 'DW_FORM_block2', // block
  0x04: 'DW_FORM_block4', // block
  0x05: 'DW_FORM_data2', // constant
  0x06: 'DW_FORM_data4', // constant
  0x07: 'DW_FORM_data8', // constant
  0x08: 'DW_FORM_string', // string
  0x09: 'DW_FORM_block', // block
  0x0a: 'DW_FORM_block1', // block
  0x0b: 'DW_FORM_data1', // constant
  0x0c: 'DW_FORM_flag', // flag
  0x0d: 'DW_FORM_sdata', // constant
  0x0e: 'DW_FORM_strp', // string
  0x0f: 'DW_FORM_udata', // constant
  0x10: 'DW_FORM_ref_addr', // reference
  0x11: 'DW_FORM_ref1', // reference
  0x12: 'DW_FORM_ref2', // reference
  0x13: 'DW_FORM_ref4', // reference
  0x14: 'DW_FORM_ref8', // reference
  0x15: 'DW_FORM_ref_udata', // reference
  0x16: 'DW_FORM_indirect', // (see Section 7.5.3)
  0x17: 'DW_FORM_sec_offset', // lineptr, loclistptr, macptr, rangelistptr
  0x18: 'DW_FORM_exprloc', // exprloc
  0x19: 'DW_FORM_flag_present', // flag
  0x20: 'DW_FORM_ref_sig8', // reference
};

const DW_FORM_classes = {
  DW_FORM_addr: 'address',
  DW_FORM_block2: 'block',
  DW_FORM_block4: 'block',
  DW_FORM_data2: 'constant',
  DW_FORM_data4: 'constant',
  DW_FORM_data8: 'constant',
  DW_FORM_string: 'string',
  DW_FORM_block: 'block',
  DW_FORM_block1: 'block',
  DW_FORM_data1: 'constant',
  DW_FORM_flag: 'flag',
  DW_FORM_sdata: 'constant',
  DW_FORM_strp: 'string',
  DW_FORM_udata: 'constant',
  DW_FORM_ref_addr: 'reference',
  DW_FORM_ref1: 'reference',
  DW_FORM_ref2: 'reference',
  DW_FORM_ref4: 'reference',
  DW_FORM_ref8: 'reference',
  DW_FORM_ref_udata: 'reference',
  DW_FORM_indirect: 'indirect',
  DW_FORM_sec_offset: ['lineptr', 'loclistptr', 'macptr', 'rangelistptr'],
  DW_FORM_exprloc: 'exprloc',
  DW_FORM_flag_present: 'flag',
  DW_FORM_ref_sig8: 'reference',
};

module.exports = {
  DW_TAG_map: DW_TAG_map,
  DW_AT_map: DW_AT_map,
  DW_FORM_map: DW_FORM_map,
  DW_FORM_classes: DW_FORM_classes
};
