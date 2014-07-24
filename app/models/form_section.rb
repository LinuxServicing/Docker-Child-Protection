class FormSection < CouchRest::Model::Base
  include RapidFTR::Model
  include PropertiesLocalization
  use_database :form_section
  localize_properties [:name, :help_text, :description]
  property :unique_id
  property :parent_form
  property :visible, TrueClass, :default => true
  property :order, Integer
  property :fields, [Field]
  property :editable, TrueClass, :default => true
  property :fixed_order, TrueClass, :default => false
  property :perm_visible, TrueClass, :default => false
  property :perm_enabled, TrueClass
  property :validations, [String]
  property :base_language, :default=>'en'
  property :is_nested, TrueClass, :default => false
  property :is_first_tab, TrueClass, :default => false
  property :initial_subforms, Integer, :default => 0
  property :collapsed_fields, [String], :default => []

  design do
    view :by_unique_id
    view :by_parent_form
    view :by_order
    view :subform_form,
      :map => "function(doc) {
                if (doc['couchrest-type'] == 'FormSection'){
                  if (doc['fields'] != null){
                    for(var i = 0; i<doc['fields'].length; i++){
                      var field = doc['fields'][i];
                      if (field['subform_section_id'] != null){
                        emit(field['subform_section_id'], doc._id);
                      }
                    }
                  }
                }
              }"
  end

  validates_presence_of "name_#{I18n.default_locale}", :message => I18n.t("errors.models.form_section.presence_of_name")
  validate :valid_presence_of_base_language_name
  validate :validate_name_format
  validate :validate_unique_id
  validate :validate_unique_name
  validate :validate_visible_field
  validate :validate_fixed_order
  validate :validate_perm_visible

  def valid_presence_of_base_language_name
    if base_language==nil
      self.base_language='en'
    end
    base_lang_name = self.send("name_#{base_language}")
    [!(base_lang_name.nil?||base_lang_name.empty?), I18n.t("errors.models.form_section.presence_of_base_language_name", :base_language => base_language)]
  end

  def initialize(properties={}, options={})
    self["fields"] = []
    super properties, options
    create_unique_id
  end

  alias to_param unique_id

  class << self
    def enabled_by_order
      by_order.select(&:visible?)
    end

    def all_child_field_names
      all_child_fields.map { |field| field["name"] }
    end

    def all_visible_form_fields(parent_form = 'case')
      find_all_visible_by_parent_form(parent_form).map do |form_section|
        form_section.fields.find_all(&:visible)
      end.flatten
    end

    def all_child_fields
      all.map do |form_section|
        form_section.fields
      end.flatten
    end

    def enabled_by_order_without_hidden_fields
      enabled_by_order.each do |form_section|
        form_section['fields'].map! { |field| field if field.visible? }
        form_section['fields'].compact!
      end
    end

    #Create the form section if does not exists.
    #If the form section does exist will attempt
    #to create fields if the fields does not exists.
    def create_or_update_form_section(properties = {})
      return nil unless properties[:unique_id]
      form_section = self.get_by_unique_id(properties[:unique_id])
      return self.create!(properties) unless form_section
      form_section.attributes = properties
      form_section.save
      form_section
    end
  end

  #Returns the list of field names to show in collapsed subforms.
  #If there is no list defined, it will returns the first one of the fields.
  def collapsed_list
    if self.collapsed_fields.empty?
      [self.fields.select {|field| field.visible? }.first.name]
    else
      self.collapsed_fields
    end
  end

  def all_text_fields
    self.fields.select { |field| field.type == Field::TEXT_FIELD || field.type == Field::TEXT_AREA }
  end

  def all_searchable_fields
    self.fields.select { |field| field.type == Field::TEXT_FIELD || field.type == Field::TEXT_AREA || field.type == Field::SELECT_BOX }
  end

  def self.get_by_unique_id unique_id
    by_unique_id(:key => unique_id).first
  end

  def self.find_all_visible_by_parent_form parent_form
    by_parent_form(:key => parent_form).select(&:visible?).sort_by{|e| e[:order]}
  end

  def self.find_by_parent_form parent_form
    by_parent_form(:key => parent_form).sort_by{|e| e[:order]}
  end


  def self.add_field_to_formsection formsection, field
    raise I18n.t("errors.models.form_section.add_field_to_form_section") unless formsection.editable
    field.merge!({'base_language' => formsection['base_language']})
    formsection.fields.push(field)
    formsection.save
  end

  def self.get_form_containing_field field_name
    all.find { |form| form.fields.find { |field| field.name == field_name || field.display_name == field_name } }
  end

  def self.new_with_order form_section
    form_section[:order] = by_order.last ? (by_order.last.order + 1) : 1
    FormSection.new(form_section)
  end

  def self.change_form_section_state formsection, to_state
    formsection.enabled = to_state
    formsection.save
  end

  def properties= properties
    properties.each_pair do |name, value|
      self.send("#{name}=", value) unless value == nil
    end
  end

  def add_text_field field_name
    self["fields"] << Field.new_text_field(field_name)
  end

  def add_field field
    self["fields"] << Field.new(field)
  end

  def update_field_as_highlighted field_name
    field = fields.find { |field| field.name == field_name }
    existing_max_order = FormSection.highlighted_fields.
        map(&:highlight_information).
        map(&:order).
        max
    order = existing_max_order.nil? ? 1 : existing_max_order + 1
    field.highlight_with_order order
    save
  end

  def remove_field_as_highlighted field_name
    field = fields.find { |field| field.name == field_name }
    field.unhighlight
    save
  end

  def self.highlighted_fields
    all.map do |form|
      form.fields.select { |field| field.is_highlighted? }
    end.flatten
  end

  def self.sorted_highlighted_fields
    highlighted_fields.sort { |field1, field2| field1.highlight_information.order.to_i <=> field2.highlight_information.order.to_i }
  end

  def section_name
    unique_id
  end

  def is_first field_to_check
    field_to_check == fields.at(0)
  end

  def is_last field_to_check
    field_to_check == fields.at(fields.length-1)
  end

  def delete_field field_to_delete
    field = fields.find { |field| field.name == field_to_delete }
    raise I18n.t("errors.models.form_section.delete_field") if !field.editable?
    if (field)
      field_index = fields.index(field)
      fields.delete_at(field_index)
      save()
    end
  end

  def field_order field_name
    field_item = fields.find { |field| field.name == field_name }
    return fields.index(field_item)
  end

  def order_fields new_field_names
    new_fields = []
    new_field_names.each { |name| new_fields << fields.find { |field| field.name == name } }
    self.fields = new_fields
    self.save
  end

  protected

  def validate_name_format
    special_characters = /[*!@#%$\^]/
    white_spaces = /^(\s+)$/
    if (name =~ special_characters) || (name =~ white_spaces)
      return errors.add(:name, I18n.t("errors.models.form_section.format_of_name"))
    else
      return true
    end
  end

  def validate_visible_field
    self.visible = true if self.perm_visible?
    if self.perm_visible? && self.visible == false
      errors.add(:visible, I18n.t("errors.models.form_section.visible_method"))
    end
    true
  end

  def validate_fixed_order
    self.fixed_order = true if self.perm_enabled?
    if self.perm_enabled? && self.fixed_order == false
      errors.add(:fixed_order, I18n.t("errors.models.form_section.fixed_order_method"))
    end
    true
  end

  def validate_perm_visible
    self.perm_visible = true if self.perm_enabled?
    if self.perm_enabled? && self.perm_visible == false
      errors.add(:perm_visible, I18n.t("errors.models.form_section.perm_visible_method"))
    end
    true
  end

  def validate_unique_id
    form_section = FormSection.get_by_unique_id(self.unique_id)
    unique = form_section.nil? || form_section.id == self.id
    unique || errors.add(:unique_id, I18n.t("errors.models.form_section.unique_id", :unique_id => unique_id))
  end

  def validate_unique_name
  unique = FormSection.all.all? { |f| id == f.id || name == nil || name.empty? || name!= f.name }
  unique || errors.add(:name, I18n.t("errors.models.form_section.unique_name", :name => name))
  end

  def create_unique_id
    self.unique_id = UUIDTools::UUID.timestamp_create.to_s.split('-').first if self.unique_id.nil?
  end

end
